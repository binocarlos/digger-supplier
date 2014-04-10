var Supplier = require('../src');

describe('supplier', function(){

  it('should be a function', function(done) {
    var supplier = Supplier();
    supplier.should.be.a('function');
    done();
  })


})