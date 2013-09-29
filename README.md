digger-supplier
===============

A functional approach to REST api's.

A digger supplier is just a function - it accepts **req** and **reply** arguments.

req is a plain javascript object representing a HTTP request:

```js
// a request represent a load of item 1234
{
	method:'get',
	url:'/1234',
	headers:{

	},
	body:null
}

```

reply is a standard node.js callback.

## installation

	$ npm install digger-supplier --save

## usage

A supplier has 4 distinct roles to play.

 * select
 * append
 * save
 * remove

These are conceptually mapped onto the REST methods: GET, POST, PUT, DELETE

A supplier is a digger-warehouse - which means you can mount middleware onto a supplier like any other warehouse.

```js
var Supplier = require('digger-supplier');
var supplier = Supplier();

// mount a custom middleware onto the supplier
// this is called before the database methods
supplier.use(function(req, res, next){
	
})

```

The point of a supplier is to connect to a data source on the back and interpret our container queries upon that data.


## routing
It is useful to have the same supplier object deal with different backend resources (like files or databases) based upon the route that is used.

Imagine we have a supplier mounted on '/csv' - it is a csv file supplier that has access to a directory '/tmp/mycsvsupplier'.

```js
var folder = '/tmp/mycsvsupplier';
var Supplier = require('digger-supplier');

// we create the supplier with an factory function
var supplier = Supplier(function(ready){
	
	/*
	
		connect to a database or prepare a filesystem or prepare API client etc
		
	*/
	ready();
})

// we run the provision function for every request - it decides what specific database table/collection/file to use
// based upon the route
//
// it is basically a renamed .use
supplier.provision(function(route, ready){
	
	
})


```

### Database Methods
You specify what happens in your supplier when a container is:

 * searched for (select)
 * added (append)
 * updated (save)
 * deleted (remove)

```js
var Supplier = require('digger-supplier');
var supplier = Supplier();

/*

	search the database with a selector and context array
	
*/
supplier.on('select', function(select_query, reply){
	
	/*
	
		a parsed selector string

		{
			tag:'product',
			class:["onsale"],
			attr:[{
				name:"price",
				operator:"<=",
				value:100
			}],
			modifier:{
				tree:true,
				sort:"name",
				limit:"6,10"
			}
		}
		
	*/
	var selector = select_query.selector;

	/*
	
		an array of skeletons from the previous step
		this is the context (i.e. to search within)


		[{
			_digger:{
				id:123
			}
		},{
			_digger:{
				id:456
			}
		}]
		
	*/
	var context = select_query.context;
})

/*

	add an item to the database
	
*/
supplier.on('append', function(append_query, reply){
	/*
	
		a skeleton of the container we are posting to

		{
			_digger:{
				id:123
			}
		}
		
	*/
	var target = append_query.target;

	/*
	
		an array of container data to add to the target

		[{
			name:"test1",
			_digger:{
				tag:"thing",
				id:"hello"
			}
		},{
			name:"test2",
			_digger:{
				tag:"otherthing",
				id:"goodbye"
			}
		}]
		
	*/
	var append_data = append_query.data;
})

supplier.on('save', function(save_query, reply){
	/*
	
		a skeleton of the container we are saving

		{
			_digger:{
				id:123
			}
		}
		
	*/
	var target = save_query.target;

	/*
	
		the update for the container

		{
			this:"that"
		}
		
	*/
	var save_data = save_query.data;
})

supplier.on('remove', function(remove_query, reply){
	/*
	
		a skeleton of the container we are removing

		{
			_digger:{
				id:123
			}
		}
		
	*/
	var target = remove_query.target;
})


```


