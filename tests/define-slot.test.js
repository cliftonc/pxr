'use strict';

import expect from 'expect.js';
import { parxer, render } from '../index.js';
import cheerio from 'cheerio';
import fs from 'fs';
import Plugins from '../Plugins.js';

describe("Define slot parsing", function() {
  it('should parse define slot attributes and insert the content', function(done) {
      var input = "<html><div id='library'><div cx-define-slot='hello'></div></div></html>";
      parxer({
        plugins: [
          Plugins.DefineSlot(function(fragment, next) { next(null, fragment.attribs['cx-define-slot']) })
        ],
        cdn: {
          url: 'http://base.url.com/'
        },
        environment: 'test',
        variables: {
          slots: {
            'hello': true // not really using this as I am returning the content of the attribute ^^^
          }
        }
      }, input, function(err, fragmentCount, data) {
        var $ = cheerio.load(data);
        expect($('#library div').html()).to.be('hello');
        done();
      });
  });

  it('should parse define slot attributes and insert the content (replace outer)', function(done) {
      var input = "<html><div id='library'><div cx-replace-outer cx-define-slot='hello'></div></div></html>";
      parxer({
        plugins: [
          Plugins.DefineSlot(function(fragment, next) { next(null, fragment.attribs['cx-define-slot']) })
        ],
        cdn: {
          url: 'http://base.url.com/'
        },
        environment: 'test',
        variables: {
          slots: {
            'hello': true // not really using this as I am returning the content of the attribute ^^^
          }
        }
      }, input, function(err, fragmentCount, data) {
        var $ = cheerio.load(data);
        expect($('#library').html()).to.be('hello');
        done();
      });
  });

  it('should parse define slot attributes and insert the content (replace outer implicitly with compoxure tag)', function(done) {
      var input = "<html><div id='library'><compoxure cx-define-slot='hello'>xxx</compoxure></div></html>";
      parxer({
        plugins: [
          Plugins.DefineSlot(function(fragment, next) { next(null, fragment.attribs['cx-define-slot']) })
        ],
        cdn: {
          url: 'http://base.url.com/'
        },
        environment: 'test',
        variables: {
          slots: {
            'hello': true // not really using this as I am returning the content of the attribute ^^^
          }
        }
      }, input, function(err, fragmentCount, data) {
        var $ = cheerio.load(data);
        expect($('#library').html()).to.be('hello');
        done();
      });
  });
});
