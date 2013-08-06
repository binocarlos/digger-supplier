digger-supplier
===============

A database warehouse for digger.io.

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

A supplier can 'specialize' - this means specifying a particular function when the selector matches a given statement.

For example - here we create a specific handler for any query that is the 'user' tag.

```js
var Supplier = require('digger-supplier');
var supplier = Supplier();

/*

	create a specialist which will deal with any interaction with a 'user' container

*/
supplier.specialize('user', function(specialist){
	specialist.on('select', function(select_query, reply){

	})
	specialist.on('append', function(select_query, reply){
	
	})
	specialist.on('save', function(select_query, reply){
	
	})
	specialist.on('remove', function(select_query, reply){
	
	})
})

/*

	the normal supplier

*/
supplier.on('select', function(select_query, reply){

})
supplier.on('append', function(select_query, reply){

})
supplier.on('save', function(select_query, reply){

})
supplier.on('remove', function(select_query, reply){

})

```

Statements for specialists can contain:

 * tagname
 * classname
 * id

### routing
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


