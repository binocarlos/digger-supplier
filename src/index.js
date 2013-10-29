/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/**
 * Module dependencies.
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var utils = require('digger-utils');
var async = require('async');
var miniware = require('miniware');
var Selector = require('digger-selector');

module.exports = function factory(options){

  options = options || {};

  /*
  
    our middleware stack
    
  */
  var stack = miniware();

  var supplier = function(req, reply){


    supplier.handle_provision(req, function(error){

      if(error){
        reply(error);
        return;
      }

      stack(req, reply, function(){

        process.nextTick(function(){

          supplier.handle(req, function(error, results){

            process.nextTick(function(){
              reply(error, results);
            })
          });
        })
      })
            
    })
    
  }

  for(var i in EventEmitter.prototype){
    supplier[i] = EventEmitter.prototype[i];
  }

  /*
  
    this is called to tell the supplier what properties to chunk from the url

    e.g.

      /mongo is the mountpoint

      supplier.provision('database', 'collection');

      /mongo/bob/apples/select

      becomes

      /select

      with req.headers['x-json-resource'] = {
        database:'bob',
        collection:'apples'
      }
    
  */
  supplier.provision = function(){
    var routes = utils.toArray(arguments);

    if(!routes || routes.length<=0){
      return this;
    }
    
    this._provision_routes = routes;
    return this;
  }

  /*
  
    add a middleware - these are run before the request events are triggered
    
  */
  supplier.use = function(fn){
    stack.use(fn);
    return this;
  }

  /*
  
    this processes the url into a resource object that the supplier will prepare before the request is run
    
  */
  supplier.handle_provision = function(req, done){
    var resource = {};

    // do we have anything to provision ?
    if(this._provision_routes && this._provision_routes.length>=0){

      var original_url = req.url;
      var parts = req.url.split('/');
      parts.shift();

      if(parts.length<this._provision_routes.length){
        done('provision paths needs ' + this._provision_routes.length + ' parts');
        return;
      }

      var extra_supplier_route = [];

      this._provision_routes.forEach(function(name){
        resource[name] = parts.shift();
        extra_supplier_route.push(resource[name]);
      })

      req.url = '/' + parts.join('/');
      var supplier_route = req.headers['x-supplier-route'];
      supplier_route += '/' + extra_supplier_route.join('/');
      req.headers['x-supplier-route'] = supplier_route;
      supplier.emit('digger:provision', {
        original_url:original_url,
        supplier_route:supplier_route
      }, resource)
    }

    req.headers['x-json-resource'] = resource;
    if(req.headers['x-json-supplier-alias']){
      var alias = req.headers['x-json-supplier-alias'];

      var route = req.headers['x-supplier-route'];

      if(route.indexOf(alias.from)==0){
        var url = route.substr(alias.from.length);
        req.headers['x-supplier-route'] = alias.to + url;
      }      
    }

    done();
  }

  /*
  
    this can be overriden - it tells us whether a string is a container id
    or if we should treat it as a selector
    
  */
  supplier.matchid = utils.isdiggerid;

  supplier.handle = function(req, finalreply){
    var self = this;

    //supplier.emit('request', req);

    /*
    
      stamp containers on their way out
      
    */

    function stamp(results){
      return (results || []).map(function(item){
        var digger = item._digger || {};
        digger.diggerwarehouse = req.headers['x-supplier-route'];
        item._digger = digger;
        return item;
      })
    }

    var reply = function(error, results){
      process.nextTick(function(){


        finalreply(error, results);
      })      
    }

    /*
    
      ping
      
    */
    if(req.url.match(/\/ping$/)){
      reply(null, [{
        _digger:{
          tag:'pong'
        }
      }])
    }
    /*
    
      resolve select query
      
    */
    
    else if(req.method==='get' || (req.method==='post' && (req.url.match(/\/select/) || req.url.match(/\/tree/)))){
      req.selector = req.headers['x-json-selector'];
      req.route = req.headers['x-supplier-route'];
      req.context = req.body || [];
      
      /*
      
        /select is a direct contract request with a x-json-selector header
        
      */
      if(req.url!=='/select' && req.url!=='/'){

        /*
        
          look at the url to see if we have an id and / or selector combo
          
        */
        var parts = req.url.split('/');
        parts.shift();

        /*
        
          we are running a direct id
          
        */
        var checkidparts = (parts[0] || '').split(':');
        var checkid = checkidparts.shift();

        /*
        
          a single id match - it can have modifiers
          
        */
        if(self.matchid(checkid)){
          var modifier = {
            laststep:true
          }
          checkidparts.forEach(function(part){
            modifier[part] = true;
          })
          req.selector = req.headers['x-json-selector'] = {
            diggerid:checkid,
            modifier:modifier
          }
        }else{
          req.selector = req.headers['x-json-selector'] = Selector.mini(checkid);
          req.selector.modifier.laststep = true;
        }
      }
    

      /*
      
        STAMP Containers
        
      */
      supplier.emit('select', req, function(error, result){

        if(error){
          reply(error);
          return;
        }

        /*
        
          if the result has a symlinks digger.header
          then we tell the reception to branch the contract
          to there
          
        */
        var symlinks = {};
        var linkcount = 0;

        // loop the containers and stamp with our location
        // this lets save and append and delete requests get back to here
        result = (result || []).map(function(item, index){
          var digger = item._digger || {};
          if(digger.symlinks){

            for(var linkid in digger.symlinks){
              linkcount++;
              if(linkid.indexOf('attr:')==0){
                symlinks[linkid] = {
                  type:'attr',
                  targetindex:index,
                  link:digger.symlinks[linkid],
                  data:item
                }

                return item;
              }
              else{
                // we are replacing the link
                symlinks[linkid] = {
                  type:'symlink',
                  targetindex:index,
                  link:digger.symlinks[linkid]
                }

                // return a blank stub
                // reception will fill this with the results
                // from the symlink
                return {
                  _digger:item._digger
                };
              }              
            }
          }
          else{
            return item;
          }
        })

        result = stamp(result);

        supplier.emit('digger:action', 'select', req, (result || []).length);

        var packet = linkcount>0 ? {
          headers:{
            symlinks:symlinks
          },
          body:result
        } : result;

        reply(error, packet);
      })
      
    }
    else if(req.method==='post'){
      var match;

      if(match = req.url.match(/^\/(\w+)/)){

        var id = match[1];

        supplier.emit('load', {
          id:match[1],
          headers:req.headers
        }, function(error, context){
          req.context = context;
          supplier.emit('append', req, function(error, results){
            if(!error){
              results = stamp(results);
            }
            reply(error, results);
            if(!error){
              supplier.emit('digger:action', 'append', req, results);    
            }
          })
          
        })
      }
      else{
        supplier.emit('append', req, function(error, results){
          reply(error, results);

          if(!error){
            supplier.emit('digger:action', 'append', req, results);    
          }
        })
        
      }
    }
    else if(req.method==='put'){
      supplier.emit('save', req, function(error, results){
        reply(error, results);

        if(!error){
          supplier.emit('digger:action', 'save', req, results);    
        }
      })
    }
    else if(req.method==='delete'){
      supplier.emit('remove', req, function(error, results){
        reply(error, results);

        if(!error){
          supplier.emit('digger:action', 'remove', req, results);    
        }
      })
    }
  }

  supplier.load = function(req, reply){
    req.headers['x-json-selector'] = {
      diggerid:req.id
    }
    this.select(req, reply);
  }

  if(options.provision){
    if(!utils.isArray(options.provision)){
      options.provision = [options.provision];
    }
    supplier.provision.apply(supplier, options.provision);
  }
  
  return supplier;
}