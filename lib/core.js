import _ from'lodash';
import async from 'async';
import attr from './attr.js';

function render(text, data) {
    if (!text) { return ''; }
    const template = (str, obj) => str.replace(/\${(.*?)}/g, (x,g)=> obj[g]);
    const output = template(text, data);
    return output;
}

function matchPlugin(plugins, tagname, attribs, config, state) {
    if(!plugins) { return false; }
    var matched = false;
    plugins.forEach(function(plugin) {
        matched = matched || plugin.match(tagname, attribs, config, state);
    });
    return matched;
}

function createTag(tagname, attribs, selfClosing) {
    var attribArray = [], attribLength = attribs.length, attribCounter = 0;
    _.forIn(attribs, function(value, key) {
        attribCounter++;
        attribArray.push(' ' + key + '="' + value + '"');
    });
    return ['<',tagname,(attribLength > 0 ? ' ' : '')].concat(attribArray).concat([(selfClosing ? '/>' :'>')]).join('');
}

function createAssetTag(bundleType, inUrl, attribs) {
    if(bundleType === 'js') {
      attribs.src = inUrl;
      return createTag('script', attribs, false) + '</script>';
      //return '<script src="' + directAssetUrl + '"></script>';
    } else if(bundleType === 'css') {
      attribs.href = inUrl;
      attribs.rel = attribs.rel || 'stylesheet';
      attribs.media = attribs.media || 'all';
      return createTag('link', attribs, true);
    } else {
      return '<!-- IGNORED ' + bundleType + ' - ' + inUrl + ' -->'
    }
}

function pushFragment(tagname, attribs, state, deferred, handler, onSuccess, onError) {
    state.nextOutput();
    state.setOutput('_processing_');
    state.createFragmentOutput(tagname, attribs, deferred);
    state.setBlock('inside-fragment', tagname);
    var fragment = state.getCurrentFragment();
    var fragmentCallback = function(err, response) {
        if(err) {
            // If errored, display error based on configuration
            state.setFragmentError(fragment, err);
            state.setFragmentErrorOutput(fragment, err);
            if(onError) { onError(); }
        } else if (!response) {
            // If no error or response, just leave the HTML where it is
            state.setFragmentDone(fragment);
            state.setFragmentDefaultOutput(fragment);
        } else {
            // We have a response
            state.setFragmentDone(fragment);
            state.setFragmentOutput(fragment, response);
            if(onSuccess) { onSuccess(); }
        }
    }
    if(!deferred) {
        handler(fragment, fragmentCallback);
    } else {
        state.defer({key:deferred, fragment:fragment, handler:handler, callback: fragmentCallback});
    }
    state.nextOutput();
    state.nextFragment();
}

function processDeferredStack(config, state, next) {    
    async.mapSeries(state.getDeferredStack(), function(deferred, cb) {
        var fragment = deferred.fragment;
        var attrs = fragment.attribs;
        var urlAttr = attr.getAttr(config.prefix + 'url', attrs);
        if (urlAttr) {
          attrs[urlAttr] = render(attrs[urlAttr].toString(), config.variables);
        }
        deferred.handler(fragment, function(err, response) {
            deferred.callback(err, response);
            cb();
        });
    }, next);
}

function isCxCustomTag(tagname) {
    return tagname.indexOf('compoxure') === 0;
}

function renderTextInHandler(handler, variables) {
    return function(fragment, next){
        handler(fragment, function (err, content, headers) {
            next(err, render(content, variables), headers);
        });
    };
}


// https://www.w3.org/TR/preload/
var ext2as = {
  js: 'script',
  css: 'style',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  svg: 'image',
  gif: 'image',
  aac: 'media',
  avi: 'media',
  mp3: 'media',
  mp4: 'media',
  mkv: 'media',
  ogg: 'media',
  wma: 'media',
  ttf: 'font',
  woff: 'font'
};

function getClientHint(url, rel) {
  rel = rel || 'preload';
  var ext = url.split('.').pop().toLowerCase();
  var asAttr = ext in ext2as ? ext2as[ext] : '';
  return { url: url, rel: rel, asAttr: asAttr };
}

function getClientHintHeader(url, rel) {
  var d = getClientHint(url, rel);
  d.asAttr = d.asAttr ? '; as=' + d.asAttr : '';
  return '<' + d.url + '>; rel=' + d.rel + d.asAttr;
}

function getClientHintTag(url, attribs) {
  var d = getClientHint(url, attribs.rel);
  var tagProps = { rel: d.rel, as: d.asAttr, href: url };
  if (attribs.id) { tagProps.id = attribs.id; }
  return createTag('link', tagProps, true);
}

export default {
    render: render,
    matchPlugin: matchPlugin,
    createTag: createTag,
    createAssetTag: createAssetTag,
    pushFragment: pushFragment,
    processDeferredStack: processDeferredStack,
    isCxCustomTag: isCxCustomTag,
    renderTextInHandler: renderTextInHandler,
    getClientHintHeader: getClientHintHeader,
    getClientHintTag: getClientHintTag
};
