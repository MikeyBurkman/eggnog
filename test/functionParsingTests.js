var expect = require('expect.js');

var utils = require('../src/utils.js');

describe('Tests for utils.parseFunctionArgs', function() {

  var parseFunctionArgs = utils.parseFunctionArgs;

  describe('one line functions', function() {

    it('parses no arguments', function() {
      var fn = function(){};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([]);
    });

    it('parses one argument', function() {
      var fn = function(/*foo/bar*/ arg1) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['foo/bar', 'arg1']]);
    });

    it('parses one argument non-anonymous', function() {
      var fn = function fn(/*foo/bar*/ arg1) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['foo/bar', 'arg1']]);
    });

    it('parses multiple arguments', function() {
      var fn = function(/*foo/bar*/ arg1, /*baz/bux*/ arg2) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['foo/bar', 'arg1'], ['baz/bux', 'arg2']]);
    });

    it('parses multiple arguments non-anonymous', function() {
      var fn = function fn(/*foo/bar*/ arg1, /*baz/bux*/ arg2) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['foo/bar', 'arg1'], ['baz/bux', 'arg2']]);
    });

    it('parses one argument, mixed spacing', function() {
      var fn = function(/*foo/bar */arg1) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['foo/bar', 'arg1']]);
    });

    it('parses multiple arguments, mixed spacing', function() {
      var fn = function fn(/*foo/bar*/arg1,/* baz/bux*/arg2) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['foo/bar', 'arg1'], ['baz/bux', 'arg2']]);
    });

    it('parses multiple arguments, special characters', function() {
      var fn = function fn(/*boo::foo/bar*/arg1,/* dar::baz/bux*/arg2) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['boo::foo/bar', 'arg1'], ['dar::baz/bux', 'arg2']]);
    });

  });

  describe('multiline functions', function() {
    it('parses multiple arguments', function() {
      var fn = function(
        /*foo/bar*/ arg1,
        /*baz/bux*/ arg2
      ) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['foo/bar', 'arg1'], ['baz/bux', 'arg2']]);
    });

    it('parses multiple arguments mixed spacing', function() {
      var fn = function(
        /*foo/bar */ arg1,
        /* baz/bux */arg2,/* qwe/sld/wer*/arg3
      ) {};
      var args = parseFunctionArgs(fn);
      expect(args).to.eql([['foo/bar', 'arg1'], ['baz/bux', 'arg2'], ['qwe/sld/wer', 'arg3']]);
    });

  });

  it('parses functions that contain other functions', function() {
    var fn = function(/* foo::bar */  bar) {
    	return function otherFn(x, y) {
    	}
    };

    var args = parseFunctionArgs(fn);
    expect(args).to.eql([['foo::bar', 'bar']]);
  });

});
