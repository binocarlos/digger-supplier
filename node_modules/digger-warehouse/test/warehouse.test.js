var Warehouse = require('../src');
var Network = require('digger-network');

describe('warehouse', function(){

  it('should be a function', function(done) {
    var warehouse = Warehouse();
    warehouse.should.be.a('function');
    done();
  })

  it('should complete a request response cycle', function(done) {

    var warehouse = Warehouse();

    warehouse.use(function(req, res){
      res.send(req.query.data);
    })

    var req = Network.request({
      method:'get',
      query:{
        data:10
      }
    })

    var res = Network.response(function(data){
      data.should.equal(10);
      done();
    })

    warehouse(req, res);

  })

  it('should wait for a prepare function', function(done) {

    var warehouse = Warehouse();

    var counter = 0;
    warehouse.prepare(function(ready){
      counter = 2;
      ready();
    })

    warehouse.use(function(req, res){
      counter.should.equal(2);
      res.send(10);
    })

    var req = Network.request({
      method:'get'
    })

    var res = Network.response(function(data){
      data.should.equal(10);
      done();
    })

    warehouse(req, res);

  })

  it('should route based on method', function(done){
    var warehouse = Warehouse();

    warehouse.get(function(req, res){
      res.send('should not happen');
    })

    warehouse.post(function(req, res){
      res.send(req.body);
    })

    var req = Network.request({
      method:'post',
      body:10
    })

    var res = Network.response(function(data){
      data.should.equal(10);
      done();
    })

    warehouse(req, res, function(){
      
    });
  })

  it('should route based on method and path containing variable ids', function(done){
    var warehouse = Warehouse();

    warehouse.get('/another/path/:id/:method', function(req, res){
      req.params.id.should.equal('123');
      req.params.method.should.equal('dig');
      res.send(req.body + 15);
    })

    var req = Network.request({
      method:'get',
      url:'zmq://warehouse.digger/another/path/123/dig',
      body:10
    })

    var res = Network.response(function(data){
      data.should.equal(25);
      done();
    })

    warehouse(req, res);
  })

  it('should route based on path', function(done){
    var warehouse = Warehouse();

    warehouse.use('/a/path', function(req, res){
      res.send('should not happen');
    })

    warehouse.use('/another/path', function(req, res){
      res.send(10);
    })

    var req = Network.request({
      method:'get',
      url:'zmq://warehouse.digger/another/path',
      body:10
    })

    var res = Network.response(function(data){
      data.should.equal(10);
      done();
    })

    warehouse(req, res);
  })

  it('should chunk off the path as layers are matched', function(done){
    var warehouse = Warehouse();
    var subwarehouse = Warehouse();

    subwarehouse.use(function(req, res){
      res.send(req.pathname);
    })

    warehouse.use('/a/toppath', subwarehouse);

    var req = Network.request({
      method:'get',
      url:'axon://warehouse.digger/a/toppath/123'
    })

    var res = Network.response(function(data){
      data.should.equal('/123');
      done();
    })

    warehouse(req, res);
  })
  
  it('should emit events as requests are handled', function(done){
    var warehouse = Warehouse();

    warehouse.use(function(req, res){
      res.send('ok');
    })

    var hitreq = false;

    warehouse.on('request', function(req){
      hitreq = true;
      done();
    })

    var req = Network.request({
      method:'get',
      url:'axon://warehouse.digger/a/toppath/123'
    })

    var res = Network.response(function(data){
      hitreq.should.equal(true);
    })

    warehouse(req, res);
  })


  it('should respond with a 404 if the route is not found', function(done){
    var warehouse = Warehouse();

    warehouse.use('/somewhere/123', function(req, res){
      res.send('ok');
    })

    var req = Network.request({
      method:'get',
      url:'axon://warehouse.digger/somewhere/124'
    })

    var res = Network.response(true);

    res.on('success', function(){
      throw new Error('should not happen');
    })

    res.on('failure', function(){
      res.statusCode.should.equal(404);
      done();
    })

    warehouse(req, res);
  })

  it('should allow a handler to be inserted at the start of the stack', function(done){
    var warehouse = Warehouse();

    warehouse.use(function(req, res, next){
      throw new Error('this should never happen');
    })
    
    warehouse.use('before', function(req, res, next){
      done();
    })

    var req = Network.request({
      method:'get',
      url:'/'
    })

    var res = Network.response(true);

    warehouse(req, res);
  })
})
