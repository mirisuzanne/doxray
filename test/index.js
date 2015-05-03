var chai = require('chai');
var assert = chai.assert;
var CommentDocs = require('../index');
var commentDocs = new CommentDocs();
var fileMappingProcessor = require('../processors/file-mappings.js');
var slugifyProcessor = require('../processors/slugify.js');
var colorPaletteProcessor = require('../processors/color-palette.js');

chai.use( require('chai-fs') );

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
      commentDocs.getFileContents( 'test/test.css', commentDocs.regex.css ),
      '/* doxray\n    prop1: Comment one\n*/\n'
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
        '/* doxray\n    prop1: Comment one\n*/\n',
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
        '/* doxray\n    prop1: Comment one\n*/\n',
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
        '/* doxray\n    prop1: Comment one\n*/\n.test{\n    content:\"Hello\";\n}',
        commentDocs.regex.css
      ),
      [ '.test{\n    content:\"Hello\";\n}' ]
    );
  });
});

describe('#parsingIsValid', function() {
  it('validates that their is one code snippet (even if it\'s an empty string) for each doc comment', function() {
    var fileContents = '/* doxray\n    prop1: Comment one\n*/\n.test{\n    content:\"Hello\";\n}';
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
      commentDocs.joinDocsAndCode( docs, code, 'test.css' ),
      [{
        docs: docs[0],
        code: [{
          filename: 'test.css',
          type: '.css',
          code: code[0]
        }]
      }]
    );
  });
});

describe('#parseOneFile', function() {
  it('parses a single file into an array of objects', function() {
    assert.deepEqual(
      commentDocs.parseOneFile( 'test/test.css' ),
      [{
        docs: { prop1: 'Comment one' },
        code: [{
          filename: 'test.css',
          type: '.css',
          code: ''
        }]
      }]
    );
  });
});

describe('#parse', function() {
  it('parses a single file when the first argument is a string that is a path to an existing file', function() {
    assert.deepEqual(
      commentDocs.parse( 'test/test.css' ),
      [
        [{
          docs: { prop1: 'Comment one' },
          code: [{
            filename: 'test.css',
            type: '.css',
            code: ''
          }]
        }]
      ]
    );
  });
});

describe('#parse', function() {
  it('parses an array of files when the first argument is an array of strings that are paths to existing files', function() {
    assert.deepEqual(
      commentDocs.parse( [ 'test/test.css', 'test/test.less' ], false ),
      [
        [{
          docs: { prop1: 'Comment one' },
          code: [
            {
              filename: 'test.css',
              type: '.css',
              code: ''
            }
          ]
        }],
        [{
          docs: { prop1: 'Comment one' },
          code: [
            {
              filename: 'test.less',
              type: '.less',
              code: ''
            }
          ]
        }]
      ]
    );
  });
});

describe('#parse', function() {
  it('throws an error when the first argument is not a string or an array', function() {
    assert.throws(
      function() { commentDocs.parse( {} ); },
      Error,
      'parse() expected a String or Array.'
    );
    assert.throws(
      function() { commentDocs.parse( 123 ); },
      Error,
      'parse() expected a String or Array.'
    );
  });
});

describe('#mergeParsedSources', function() {
  it('merges two objects if their docs are identical', function() {
    assert.deepEqual(
      commentDocs.parse( [ 'test/test.css', 'test/test.less' ], true ),
      [
        [
          {
            docs: { prop1: 'Comment one' },
            code: [
              {
                filename: 'test.css',
                type: '.css',
                code: ''
              },
              {
                filename: 'test.less',
                type: '.less',
                code: ''
              }
            ]
          },
        ]
      ]
    );
    assert.deepEqual(
      commentDocs.mergeParsedSources(
        [
          [
            {
              docs: { name: 'pattern one' },
              code: [
                { code: 'test.css code', filename: 'test.css' }
              ]
            },
            {
              docs: { name: 'pattern two' },
              code: [
                { code: 'test.css code', filename: 'test.css' }
              ]
            }
          ],
          [
            {
              docs: { name: 'pattern one' },
              code: [
                { code: 'test.less code', filename: 'test.less' }
              ]
            },
            {
              docs: { name: 'pattern two' },
              code: [
                { code: 'test.less code', filename: 'test.less' }
              ]
            }
          ]
        ]
      ),
      [
        {
          docs: { name: 'pattern one' },
          code: [
            { code: 'test.css code', filename: 'test.css' },
            { code: 'test.less code', filename: 'test.less' }
          ]
        },
        {
          docs: { name: 'pattern two' },
          code: [
            { code: 'test.css code', filename: 'test.css' },
            { code: 'test.less code', filename: 'test.less' }
          ]
        }
      ]
    );
  });
});

describe('#mergeParsedSources', function() {
  it('when attempting to merge two', function() {
    assert.deepEqual(
      commentDocs.mergeParsedSources(
        [
          [
            {
              docs: { name: 'pattern name' },
              code: [
                { code: 'test.css code', filename: 'test.css' },
                { code: 'test.less code', filename: 'test.less' }
              ]
            }
          ],
          [
            {
              docs: { name: 'a different pattern name' },
              code: [
                { code: 'test.less code', filename: 'test.less' }
              ]
            }
          ]
        ]
      ),
      [
        {
          docs: { name: 'pattern name' },
          code: [
            { code: 'test.css code', filename: 'test.css' },
            { code: 'test.less code', filename: 'test.less' }
          ]
        },
        {
          docs: { name: 'a different pattern name' },
          code: [
            { code: 'test.less code', filename: 'test.less' }
          ]
        }
      ]
    );
  });
});

describe('#postParseProcessing', function() {
  it('runs an array of processing functions over a parsed set of docs', function() {
    assert.deepEqual(
      commentDocs.postParseProcessing( commentDocs.parse( 'test/test.css' ), [
        function( parsed ) {
          return '';
        }
      ] ),
      ''
    );
    assert.deepEqual(
      commentDocs.postParseProcessing( commentDocs.parse( 'test/test.css' ), [
        function( parsed ) {
          parsed.files = [];
          parsed.customData = 'my custom data';
          return parsed;
        }
      ] ),
      {
        maps: {},
        files: [],
        customData: 'my custom data'
      }
    );
  });

  it('provides a mapping of filenames via the file mappings processor when passing parse() and single file', function() {
    assert.deepEqual(
      commentDocs.postParseProcessing( commentDocs.parse( 'test/test.css' ),
        [ fileMappingProcessor ]
      ).maps.files.indexes,
      { 'test.css': 0 }
    );
  });

  it('provides a mapping of filenames via the file mappings processor when passing parse() and array', function() {
    assert.deepEqual(
      commentDocs.postParseProcessing( commentDocs.parse( [ 'test/test.css', 'test/test.less' ] ),
        [ fileMappingProcessor ]
      ).maps.files.indexes,
      { 'test.css': 0, 'test.less': 0 }
    );
  });

  it('provides a mapping of filenames via the file mappings processor when passing parse() and array and not merging them', function() {
    assert.deepEqual(
      commentDocs.postParseProcessing( commentDocs.parse( [ 'test/test.css', 'test/test.less' ], false ),
        [ fileMappingProcessor ]
      ).maps.files.indexes,
      { 'test.css': 0, 'test.less': 1 }
    );
  });

  it('slugifys the label property in a doc via the slugify processor', function() {
    function run() {
      var parsed = commentDocs.postParseProcessing(
            commentDocs.parse( 'test/slugify-test.css' ),
            [ slugifyProcessor ]
          );
      return parsed.files[0][0].docs.slug + ' ' +
             parsed.files[0][1].docs[0].slug + ' ' +
             parsed.files[0][1].docs[1].slug + ' ' +
             parsed.files[0][2].docs[0].slug;
    }
    assert.equal(
      run(),
      'comment-one comment-two comment-three specialcharacters'
    );
  });

  it('slugifys the label property in a doc and prepends a header if one exists when using the slugify processor', function() {
    function run() {
      var parsed = commentDocs.postParseProcessing(
            commentDocs.parse( 'test/slugify-test.css' ),
            [ slugifyProcessor ]
          );
      return parsed.files[0][3].docs[0].slug + ' ' +
             parsed.files[0][3].docs[1].slug + ' ' +
             parsed.files[0][3].docs[2].slug + ' ' +
             parsed.files[0][4].docs[0].slug + ' ' +
             parsed.files[0][4].docs[1].slug + ' ' +
             parsed.files[0][4].docs[2].slug;
    }
    assert.equal(
      run(),
      ('first-header first-header-comment-one first-header-comment-two ' +
       'second-header second-header-comment-one second-header-comment-two')
    );
  });

  it('uses the slugify processor to create a get function to access docs via a slug', function() {
    function run() {
      var parsed = commentDocs.postParseProcessing(
            commentDocs.parse( 'test/slugify-test.css' ),
            [ slugifyProcessor ]
          );
      return parsed.maps.slugs.get( 'comment-one', parsed ).docs.label;
    }
    assert.equal(
      run(),
      'Comment one'
    );
  });

  it('creates a color palette object when a colorPalette property specifies which file type in the code array to parse', function() {
    function run() {
      var parsed = commentDocs.postParseProcessing(
            commentDocs.parse( 'test/color-palette-test.scss' ),
            [ colorPaletteProcessor ]
          );
      return [ parsed.files[0][0].docs.colorPalette, parsed.files[0][1].docs[0].colorPalette ];
    }
    assert.deepEqual(
      run(),
      [
        [ { variable: '$white', value: '#fff' }, { variable: '$black', value: '#000' } ],
        [ { variable: '$red', value: 'red' }, { variable: '$green', value: 'rgba(0,255,0,1)' } ]
      ]
    );
  });
});

describe('#writeJSON', function() {
  it('creates a .json file out of an object', function() {
    commentDocs.writeJSON( [{}], 'test/test.json' );
    assert.isFile( 'test/test.json' );
  });
});
