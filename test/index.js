var should = require('chai').should(),
  assert = require('chai').assert,
  CommentDocs = require('../commentdocs'),
  commentDocs = new CommentDocs();

describe('#getCommentType', function() {
  it('returns the correct comment type based on the file extension', function() {
    assert.equal( commentDocs.getCommentType('test.css'), 'css' );
    assert.equal( commentDocs.getCommentType('test.less'), 'css' );
    assert.equal( commentDocs.getCommentType('test.less'), 'css' );
    assert.equal( commentDocs.getCommentType('test.html'), 'html' );
  });
});

describe('#getFileContents', function() {
  it('returns the contents of a file, trimming everything before the first doc comment', function() {
    assert.equal(
      commentDocs.getFileContents( 'test/getfilecontents.css', commentDocs.regex.css ),
      '/* topdoc\n    prop1: Comment one\n*/\n'
    );
  });
});

describe('#convertYaml', function() {
  it('converts a yaml string into an object and identifies the comment number if the conversion fails', function() {
    var yamlString = 'prop1: Comment one';
    assert.deepEqual( commentDocs.convertYaml( yamlString ), { prop1: 'Comment one' } );
    assert.throws(
      function() { commentDocs.convertYaml( 'prop1: prop1:' ); },
      Error,
      'Error converting comment to YAML. Please check for formatting errors.'
    );
    assert.throws(
      function() { commentDocs.convertYaml( 'prop1: prop1:', 0 ); },
      Error,
      'Error converting comment #1 to YAML. Please check for formatting errors.'
    );
  });
});

describe('#getTextFromDocComment', function() {
  it('removes the opening and closing comments from a doc comment', function() {
    assert.equal(
      commentDocs.getTextFromDocComment(
        '/* topdoc\n    prop1: Comment one\n*/\n',
        commentDocs.regex.css
      ),
      '    prop1: Comment one\n\n'
    );
  });
});

describe('#parseOutDocs', function() {
  it('build an array from the text of each doc comment', function() {
    assert.deepEqual(
      commentDocs.parseOutDocs(
        '/* topdoc\n    prop1: Comment one\n*/\n',
        commentDocs.regex.css
      ),
      [ { prop1: 'Comment one' } ]
    );
  });
});

describe('#parseOutCode', function() {
  it('build an array from the code after each doc comment', function() {
    assert.deepEqual(
      commentDocs.parseOutCode(
        '/* topdoc\n    prop1: Comment one\n*/\n.test{\n    content:\"Hello\";\n}',
        commentDocs.regex.css
      ),
      [ '.test{\n    content:\"Hello\";\n}' ]
    );
  });
});

describe('#parsingIsValid', function() {
  it('validates that their is one code snippet (even if it\'s an empty string) for each doc comment', function() {
    var fileContents = '/* topdoc\n    prop1: Comment one\n*/\n.test{\n    content:\"Hello\";\n}';
    var docs = commentDocs.parseOutDocs( fileContents, commentDocs.regex.css );
    var code = commentDocs.parseOutCode( fileContents, commentDocs.regex.css );
    assert.equal( commentDocs.parsingIsValid( docs, code ), true );
  });
});

describe('#joinDocsAndCode', function() {
  it('takes an array of doc comments and an array of code snippets and merges them into one object', function() {
    var docs = [ { prop1: 'Comment one' } ];
    var code = [ '.test{\n    content:\"Hello\";\n}' ];
    assert.deepEqual(
      commentDocs.joinDocsAndCode( docs, code ),
      [{
        docs: docs[0],
        code: code[0]
      }]
    );
  });
});

describe('#parseSourceFile', function() {
  it('converts a file into an array of objects', function() {
    assert.deepEqual(
      commentDocs.parseSourceFile( 'test/getfilecontents.css' ),
      [{
        docs: { prop1: 'Comment one' },
        code: ''
      }]
    );
  });
});