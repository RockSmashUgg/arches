'''
ARCHES - a program developed to inventory and manage immovable cultural heritage.
Copyright (C) 2013 J. Paul Getty Trust and World Monuments Fund

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
'''

from arches.app.utils.betterJSONSerializer import JSONSerializer
from arches.app.search.search_engine_factory import SearchEngineFactory
from arches.app.views.concept import Concept

def prepare_term_index(create=False):
    """
    Creates the settings and mappings in Elasticsearch to support term search

    """

    index_settings = {
        'settings':{
            'analysis': {
                'analyzer': {
                    'folding': {
                        'tokenizer': 'standard',
                        'filter':  [ 'lowercase', 'asciifolding' ]
                    }
                }
            }
        },
        'mappings':{
            'value':{
                'properties': {
                    'ids':{'type': 'string', 'index' : 'not_analyzed'},
                    'context':{'type': 'string', 'index' : 'not_analyzed'},
                    'term': {
                        'type': 'string',
                        'analyzer': 'standard',
                        'fields': {
                            'folded': {
                                'type': 'string',
                                'analyzer': 'folding'
                            }
                        }
                    }
                }
            }
        }
    }

    if create:
        se = SearchEngineFactory().create()
        se.create_index(index='term', body=index_settings, ignore=400)

    return index_settings

def delete_term_index():
    se = SearchEngineFactory().create()
    se.delete_index(index='term')

def prepare_search_index(resource_model_id, create=False):
    """
    Creates the settings and mappings in Elasticsearch to support resource search

    """

    index_settings = {
        'settings':{
            'analysis': {
                'analyzer': {
                    'folding': {
                        'tokenizer': 'standard',
                        'filter':  [ 'lowercase', 'asciifolding' ]
                    }
                }
            }
        },
        'mappings': {
            resource_model_id : {
                'properties' : {
                    'graphid': {'type' : 'string', 'index' : 'not_analyzed'},
                    'resourceinstanceid': {'type' : 'string', 'index' : 'not_analyzed'},
                    'primaryname': {'type' : 'string', 'index' : 'not_analyzed'},
                    'tiles' : {
                        'type' : 'nested',
                        'properties' : {
                            "tiles": {'enabled': False},
                            'tileid' : {'type' : 'string', 'index' : 'not_analyzed'},
                            'nodegroup_id' : {'type' : 'string', 'index' : 'not_analyzed'},
                            'parenttile_id' : {'type' : 'string', 'index' : 'not_analyzed'},
                            'resourceinstanceid_id' : {'type' : 'string', 'index' : 'not_analyzed'}
                        }
                    },
                    'strings' : {
                        'type' : 'string',
                        'index' : 'analyzed',
                        'fields' : {
                            'raw' : { 'type' : 'string', 'index' : 'not_analyzed'},
                            'folded': { 'type': 'string', 'analyzer': 'folding'}
                        }
                    },
                    'domains' : {
                        'properties' : {
                            'value' : {
                                'type' : 'string',
                                'index' : 'analyzed',
                                'fields' : {
                                    'raw' : { 'type' : 'string', 'index' : 'not_analyzed'}
                                }
                            },
                            'conceptid' : {'type' : 'string', 'index' : 'not_analyzed'},
                            'valueid' : {'type' : 'string', 'index' : 'not_analyzed'},
                        }
                    },
                    'geometries' : {
                        "properties": {
                            "features": {
                                "properties": {
                                    "geometry": {"type": "geo_shape"},
                                    "id": { 'type' : 'string', 'index' : 'not_analyzed'},
                                    "type": { 'type' : 'string', 'index' : 'not_analyzed'},
                                    "properties": {
                                         "enabled": False
                                    }
                                }
                            },
                            "type": { 'type' : 'string', 'index' : 'not_analyzed'}
                        }
                    },
                    'dates' : {
                        "type" : "date"
                    },
                    'numbers' : {
                        "type" : "double"
                    }
                }
            }
        }
    }

    if create:
        se = SearchEngineFactory().create()
        try:
            se.create_index(index='resource', body=index_settings)
        except:
            index_settings = index_settings['mappings']
            se.create_mapping(index='resource', doc_type=resource_model_id, body=index_settings)

    return index_settings


def delete_search_index():
    se = SearchEngineFactory().create()
    se.delete_index(index='resource')


def prepare_resource_relations_index(create=False):
    """
    Creates the settings and mappings in Elasticsearch to support related resources

    """

    index_settings = {
        'mappings':{
            'all': {
                'properties': {
                    'resourcexid': {'type': 'string', 'index' : 'not_analyzed'},
                    'notes': { 'type': 'string'},
                    'relationshiptype': {'type': 'string', 'index' : 'not_analyzed'},
                    'resourceinstanceidfrom': {'type': 'string', 'index' : 'not_analyzed'},
                    'resourceinstanceidto': {'type': 'string', 'index' : 'not_analyzed'}
                }
            }
        }
    }

    if create:
        se = SearchEngineFactory().create()
        se.create_index(index='resource_relations', body=index_settings, ignore=400)
        concept = Concept('00000000-0000-0000-0000-000000000007')
        concept.index()

    return index_settings

def delete_resource_relations_index():
    se = SearchEngineFactory().create()
    se.delete_index(index='resource_relations')
