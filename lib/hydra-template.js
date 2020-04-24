'use strict'

const {deepStrictEqual} = require('assert')

const hydraTemplate = (uriTemplate, mappings) => {
	return {
		'@type': 'hydra:IriTemplate',
		'template': uriTemplate,
		'variableRepresentation': 'BasicRepresentation',
		'mapping': mappings.map(([variable, property, required]) => ({
			'@type': 'IriTemplateMapping',
			variable,
			'required': required === true,
			property,
		})),
	}
}

deepStrictEqual(hydraTemplate('/foo{?bar,baz}', [
	['bar', 'namespace:prop1', true],
	['baz', 'namespace:prop2'],
]), {
	'@type': 'hydra:IriTemplate',
	'template': '/foo{?bar,baz}',
	'variableRepresentation': 'BasicRepresentation',
	'mapping': [{
		'@type': 'IriTemplateMapping',
		'variable': 'bar',
		'required': true,
		'property': 'namespace:prop1',
	}, {
		'@type': 'IriTemplateMapping',
		'variable': 'baz',
		'required': false,
		'property': 'namespace:prop2',
	}],
})

module.exports = hydraTemplate
