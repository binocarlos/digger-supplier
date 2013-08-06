# digger-container

A JQuery style array wrapper for JSON models

# install

## node.js

	$ npm install digger-container

## browser

You can use [browserify](https://github.com/substack/node-browserify) and use digger-container in the browser too!

# overview

This library provides an api very similar to JQuery but for messing with JSON models not DOM elements.

It can be used a stand-alone data tool or as part of a greater [digger.io](https://github.com/binocarlos/digger.io) network.

## data structure
All containers have a 'models' property.

This is an array of raw JSON objects that is the actual data the container represents.

Each model has a '_digger' property assigned to it.

This object contains the meta data about the model (tagname, classnames etc).

An example of a model:

```js
{
	name:'Ladder',
	height:354,
	_digger:{
		tag:'product',
		class:['tall', 'narrow']
	},
	_children:[]
}
```

## children
Each model in a container can also have a '_children' property.

This is an array of model data that lives 'inside' of the parent container.

This is how the digger tree structure works - by containers living inside of others.

## JQuery style accessors
A container is always an array of models - this lets you run [digger.io](https://github.com/binocarlos/digger.io) queries and have the container hold the results.

If you 'get' an attribute - the container will return the value of the first model.

If you 'set' an attribute - the container will apply the value to all models.

This is consistent with how JQuery deals with it's underlying array of DOM elements:

# examples

## Creating containers
Create a new container with a specific tagname - the tagname is like the table name in a traditional database.

```js
// this line will be assumed through all the rest of the examples
var Container = require('digger-container');

var product = Container('product');
```

You can also pass an attributes object as the second argument:

```js
var product = Container('product', {
	name:'Blue Suede Shoes',
	price:78
})
```

If you have an array of JSON models already - you can just pass that:

```
var data = [{
	name:"Superman",
	rating:7.8
},{
	name:"Spiderman",
	rating:7.9
}]

var superheroes = Container(data);
```

## Changing attributes
Once you have a container - you can change the attributes of ALL models within it at once - just like JQuery:

```
// take our superheros container from above
var superheroes = Container(data);

// set the tagnames of every model to superhero
superheroes.tag('superhero')

// set a deep attribute for each superhero - this creates an object for 'filming'
superheroes.attr('filming.city', 'Los Angeles');
```

## Spawning new containers
We can also generate new containers from the data inside of existing ones:

```
// get a container with just superman inside
var superman = superheroes.eq(0);

superman.attr('loves', 'Louis Lane');
```

## Accessing models
You can get to the raw underlying model also:

```
// get the data inside the superman model
var raw_superman = superheroes.get(0);

console.dir(raw_superman)

/*

	{
		name:"Superman",
		rating:7.8,
		loves:"Louis Lane",
		_digger:{
			tag:'superhero'
		}
	}
	
*/
```

# api

these methods can be called on an instantiated container

### toJSON
returns an array of the containers underlying models

### spawn
returns a new container based upon the provided models

### clone
returns a copy of the current container but with all of the diggerids changed

```js
var test = Container('product', {
  price:100,
  address:{
    postcode:'apples'
  }
})

var copy = test.clone();

copy.attr('price').should.equal(100);
copy.diggerid().should.not.equal(test.diggerid());
```
### containers
return an array of containers each one holding a single model in the current models array

```js
var data = [{
	name:"Superman",
	rating:7.8
},{
	name:"Spiderman",
	rating:7.9
}]

var superheroes = Container(data);

var containers = superheroes.containers();

// containers is now an array of 2 containers each with 1 model
```

### eq(index)
return a container for the model at the given index

### get(index)
return the model at index

### add(models)
add some models to the current models array

### each(fn)
run a function over this.containers()

### map(fn)
map a function over this.containers()

### count()
returns the length of the models array

### first()
return a container for the first model

### last
return a container for the last model


### children
returns a container that is all of the container models children merged into one array

### recurse
run a function over a container for each model and all descendents

### descendents
return a container containing a flat model array of every model and it's descendents

### skeleton
return an array of the _digger properties for each model


### property getter/setters
the following methods allow you to get/set the data for the models:

 * attr - top level properties
 * digger - '_digger' properties
 * data - '_digger.data' properties - not saved to database
 * diggerid - property accessor for '_digger.diggerid'
 * diggerparentid - property accessor for '_digger.diggerparentid'
 * diggerwarehouse - property accessor for '_digger.diggerwarehouse'
 * id - property accessor for '_digger.id'
 * tag - property accessor for '_digger.tag'
 * classnames - property accessor for '_digger.classnames'

### removeAttr / removeDigger / removeData
remove properties from models

### is(tagname)
tells you if the first model is a tagname

### addClass(classname)
adds a classname to the models

### removeClass(classname)
removed a classname to the models

### hasClass(classname)
tells you if the first model has the given class

### hasAttr(name)
tells you if the first model has the given attribute

### isEmpty
if models.length<=0

### inject_data(data)
extend the model with the given data

### diggerurl
return this.diggerwarehouse() + '/' + this.diggerid()

### title
the name or title property returned

### summary
a pretty string summarizing the model