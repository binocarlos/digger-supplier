var Supplier = require('../src');

describe('supplier', function(){

  it('should be a function', function(done) {
    var supplier = Supplier();
    supplier.should.be.a('function');
    done();
  })

  it('should cope with a get', function(done) {
    var supplier = Supplier();

    supplier.on('select', function(req, reply){
    	reply(null, [{name:'ok'}]);
    })
    
    supplier({
    	method:'get',
    	headers:{}
    }, function(error, answer){
    	answer[0].name.should.equal('ok');
    	done();
    })
  })

  it('should run middleware first', function(done) {

  	var check = 0;

  	var supplier = Supplier();

    supplier.on('select', function(req, reply){
    	reply(null, [{name:'ok'}]);
    })

    supplier.use(function(req, reply, next){
    	check++;
    	next();
    })

    supplier.use(function(req, reply, next){
    	check++;
    	next();
    })

    supplier.use(function(req, reply, next){
    	check++;
    	next();
    })
    
    supplier({
    	method:'get',
    	headers:{}
    }, function(error, answer){
    	answer[0].name.should.equal('ok');
    	check.should.equal(3);
    	done();
    })
  })


})