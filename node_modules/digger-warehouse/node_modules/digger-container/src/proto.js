/*

  (The MIT License)

  Copyright (C) 2005-2013 Kai Davenport

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var EventEmitter = require('events').EventEmitter;
var dotty = require('dotty');
var util = require('util');
var utils = require('digger-utils');

function Container(){}


/*

	Factory for new containers
	
*/
function factory(){
	/*
  
    first let's extract the model data
    
  */
  var models = [];

  if(typeof(arguments[0])==='string'){
    var string = arguments[0];
    var c = string.charAt(0);
    if(c==='{' || c==='['){
      var data = JSON.parse(string);
      if(c==='{'){
        data = [data];
      }
      models = data;
    }
    else{
      var model = arguments[1] || {};
      var digger = model._digger || {};
      digger.tag = string;
      model._digger = digger;
      models = [model];  
    }
    
  }
  else if(Object.prototype.toString.call(arguments[0]) == '[object Array]'){  
    models = arguments[0];
  }
  else if(typeof arguments[0]==='object'){
    models = [arguments[0]];
  }

  if(models[0]===undefined || models[0]===null){
    models = [];
  }

  var instance = function container(){
    if(!instance.select){
      throw new Error('there is no select method attached to this container');
    }
    var args = [arguments[0]];
    if(arguments.length>1){
      args.push(arguments[1]);
    }
    return instance.select.apply(instance, args);
  }

  instance.__proto__ = new Container;
  instance.build(models);
  
  return instance;
}

/*

	expose
	
*/
Container.factory = factory;

util.inherits(Container, EventEmitter);

module.exports = Container;


/*

	prototype
	
*/
Container.prototype.build = function(models){

	this.models = models || [];
	for(var i in models){
    var model = models[i];
    if(!model._digger){
      model._digger = {};
    }
		if(!model._digger.diggerid){
			model._digger.diggerid = utils.diggerid();
		}
	}
  return this;
}

Container.prototype.toJSON = function(){
  return this.models;
}

/*

	iterators

*/

Container.prototype.spawn = function(models){
  models = models || [];
	var container = Container.factory(models);
  if(this.supplychain){
    container.supplychain = this.supplychain;  
  }
	return container;
}

Container.prototype.clone = function(){
  var data = JSON.parse(JSON.stringify(this.models));

  var ret = this.spawn(data);

  ret.recurse(function(des){
  	var model = des.get(0);
  	var digger = model._digger || {};
  	digger.diggerid = utils.diggerid();
  	model._digger = digger;
  })
  ret.ensure_parent_ids();
  return ret;
}

Container.prototype.ensure_parent_ids = function(parent){

  var self = this;

  if(parent){
  	this.each(function(c){
  		c.diggerparentid(parent.diggerid());
  	})
  }

  this.children().each(function(child){
    child.ensure_parent_ids(self);
  })
}

Container.prototype.inject_paths = function(basepath){

  this.diggerpath(basepath);

  this.children().each(function(child, index){
    child.inject_paths(basepath.concat([index]));
  })

}

Container.prototype.ensure_meta = function(done){
  if(!this.diggerid()){
    this.diggerid(utils.diggerid());
  }

  var topcounter = 0;
  if(this.diggerpath().length<=0){
    this.inject_paths([topcounter]);
    topcounter++;
  }

  this.ensure_parent_ids();
  return this;
}


Container.prototype.children = function(){
  var models = [];
  var self = this;
  this.each(function(container){
    models = models.concat(container.get(0)._children || []);
  })
	return this.spawn(models);
}

Container.prototype.recurse = function(fn){
  this.descendents().each(fn);
  return this;
}

Container.prototype.descendents = function(){
  var ret = [];

  function scoopmodels(container){
    ret = ret.concat(container.models);
    container.children().each(scoopmodels);
  }

  scoopmodels(this);

  return this.spawn(ret);
}

Container.prototype.containers = function(){
  var self = this;
  return this.models.map(function(model){
    return self.spawn([model]);
  })
}

Container.prototype.skeleton = function(){
  return this.models.map(function(model){
    return model._digger || {};
  })
}

Container.prototype.add = function(container){
  var self = this;
  
  if(!container){
    return this;
  }
  
  if(Object.prototype.toString.call(container) == '[object Array]'){
    container.forEach(function(c){
      self.add(c);
    })
    
  }
  else{
    this.models = this.models.concat(container.models);
  }
  return this;
}


Container.prototype.each = function(fn){
	this.containers().forEach(fn);
	return this;
}

Container.prototype.map = function(fn){
	return this.containers().map(fn);
}

Container.prototype.count = function(){
	return this.models.length;
}

Container.prototype.first = function(){
	return this.eq(0);
}

Container.prototype.last = function(){
	return this.eq(this.count()-1);
}

Container.prototype.eq = function(index){
	return this.spawn(this.get(index));
}

Container.prototype.get = function(index){
	return this.models[index];
}

/*

	properties
	
*/


function valuereader(model, name){
  if(!name){
  	return model;
  }
  return dotty.get(model, name);
}

function valuesetter(model, value, name){
	if(!name){
  	return value;
  }
  dotty.put(model, name, value);
  return value;
}

function makepath(path, base){
	var parts = [path];
	if(base){
		parts.unshift(base);
	}
	return parts.join('.');
}

function wrapper(basepath){
	return function(path, val){
		var self = this;
		if(arguments.length<=0){
      if(self.isEmpty()){
        return null;
      }
			return valuereader(self.get(0), basepath);
		}
		else if(arguments.length===1 && typeof(path)==='string'){
      if(self.isEmpty()){
        return null;
      }
			return valuereader(self.get(0), makepath(path, basepath));
		}
		else if(arguments.length===1){
			self.models.forEach(function(model){
				valuesetter(model, val, basepath);
			})
			return self;
		}
		else if(arguments.length>1){
			var usepath = makepath(path, basepath);
			self.models.forEach(function(model){
				valuesetter(model, val, usepath);
			})
			return self;
		}
	}
}

function property_wrapper(basepath, property){
	return function(val){

		var self = this;
		if(arguments.length<=0){
      if(self.isEmpty()){
        return null;
      }
			var model = dotty.get(self.get(0), basepath);
			return model[property];
		}
		else{
      if(!self.isEmpty()){
        self.models.forEach(function(model){
          var basemodel = dotty.get(model, basepath);
          basemodel[property] = val;
        })  
      }
			
			return self;
		}
	}
}

function remove_wrapper(basepath){
	return function(path){
		var self = this;
		var usepath = makepath(path, basepath);
		self.models.forEach(function(model){
			dotty.remove(model, usepath);
		})	
		return self;
	}	
}


Container.prototype.attr = wrapper();
Container.prototype.digger = wrapper('_digger');
Container.prototype.data = wrapper('_digger.data');

Container.prototype.diggerid = property_wrapper('_digger', 'diggerid');
Container.prototype.diggerparentid = property_wrapper('_digger', 'diggerparentid');
Container.prototype.diggerwarehouse = property_wrapper('_digger', 'diggerwarehouse');
var pathwrapper = property_wrapper('_digger', 'diggerpath');
Container.prototype.diggerpath = function(){
  var ret = pathwrapper.apply(this, utils.toArray(arguments));

  if(!utils.isArray(ret)){
    ret = [];
  }

  return ret;
}


var branchwrapper = property_wrapper('_digger', 'diggerbranch');
Container.prototype.diggerbranch = function(){
  var ret = branchwrapper.apply(this, utils.toArray(arguments));

  if(!utils.isArray(ret)){
    ret = [];
  }

  return ret;
}

Container.prototype.addBranch = function(where){
  var self = this;
  var branches = this.diggerbranch();
  where.each(function(container){
    branches.push(container.diggerurl());
  })
  this.diggerbranch(branches);
  return this;
}

Container.prototype.removeBranch = function(where){
  var self = this;
  var branches = this.diggerbranch();

  where.each(function(container){

    var newbranches = [];
    for(var i=0; i<branches.length; i++){
      if(branches[i]!=container.diggerurl()){
        newbranches.push(branches[i]);
      }
    }
    branches = newbranches;
  })
  this.diggerbranch(branches);
  return this;
}

Container.prototype.id = property_wrapper('_digger', 'id');
Container.prototype.tag = property_wrapper('_digger', 'tag');
Container.prototype.classnames = property_wrapper('_digger', 'class');

Container.prototype.removeAttr = remove_wrapper();
Container.prototype.removeDigger = remove_wrapper('_digger');
Container.prototype.removeData = remove_wrapper('_digger.data');

Container.prototype.is = function(tag){
  return this.tag()==tag;
}

Container.prototype.addClass = function(classname){
  var self = this;
  this.models.forEach(function(model){
    var classnames = model._digger.class || [];
    var found = false;
    classnames.forEach(function(c){
    	if(c==classname){
    		found = true;
    	}
    })
    if(!found){
    	classnames.push(classname);	
    }
    model._digger.class = classnames;
  })
  return this;
}

Container.prototype.removeClass = function(classname){
  var self = this;
  this.models.forEach(function(model){
    var classnames = model._digger.class || [];
    var newclassnames = [];
    classnames.forEach(function(c){
    	if(c!=classname){
    		newclassnames.push(c);
    	}
    })
    model._digger.class = newclassnames;
  })
  return this;
}

Container.prototype.hasClass = function(classname){
	var found = false;
	(this.classnames() || []).forEach(function(c){
		if(c==classname){
			found = true;
		}
	})
  return found;
}

Container.prototype.hasAttr = function(name){
	var prop = this.attr(name);
	return prop!==null;
}

Container.prototype.isEmpty = function(){
  return this.count()===0;
}

Container.prototype.inject_data = function(data){
	this.models.forEach(function(model){
		utils.extend(model, data);
	})
  return this;
}


Container.prototype.diggerurl = function(){
  var warehouse = this.diggerwarehouse();
  var id = this.diggerid();

  var url = warehouse || '/';

  if(id && this.tag()!='_supplychain'){
    if(warehouse!='/'){
      url += '/';
    }

    url += id;
  }
  
  return url.replace(/\/\//g, '/');
}

/*

	summary methods
	
*/

Container.prototype.title = function(){
  var name = this.attr('name');
  if(!name){
    name = this.attr('title');
  }
  if(!name){
    name = this.tag();
  }
  return name;
}

Container.prototype.summary = function(options){

  options = options || {};

  var parts = [];

  var title = (this.attr('name') || this.attr('title') || '')
  if(title.length>0 && options.title!==false){
    parts.push(title + ': ');
  }

  parts.push(this.tag());

  var id = this.id() || '';
  if(id.length>0){
    parts.push('#' + id);
  }

  var classnames = this.classnames() || [];
  if(classnames.length>0){
    classnames.forEach(function(classname){
      if(classname.match(/\w/)){
        parts.push('.' + classname.replace(/^\s+/, '').replace(/\s+$/, ''));
      }
    })
  }

  return parts.join('');
}

Container.prototype.toString = function(){
  return this.summary();
}