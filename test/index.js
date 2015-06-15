var fs = require('fs');
var chai = require('chai');
var assert = chai.assert;
var Doxray = require('../doxray');
var doxray = new Doxray();

chai.use( require('chai-fs') );

// TODO: save temp files to a temp directory and set flag for deleting them in case you want to review them manually.
// TODO: set a console.log flag for Doxray().
// TODO: make a function to create yaml errors so we can test the error strings here.
// TODO: move some methods to a utils prop to clean up the order of methods
// TODO: better order for methods and tests

console.log('The purpose of Doxray is to parse text files and convert special Doxray comments into structured objects that can be used to generate pattern libraries.');

describe('Doxray core', function() {

  describe('run()', function() {
    it('should parse the requested file into an array of pattern objects', function() {
      var docs;
      var file = 'test/run-test.js';
      docs = doxray.run( 'test/test.css', { jsFile: file }, function() {
        assert.deepEqual(
          docs.patterns[0].prop1,
          'Comment one'
        );
      });
    });

    it('should write the parsed data to the .json file specified in the jsonFile option, and then run the provided callback function', function() {
      var docs;
      var file = 'test/run-test.json';
      if ( fs.existsSync( file ) ) {
        fs.unlinkSync( file );
      }
      docs = doxray.run( 'test/test.css', { jsonFile: file }, function() {
        assert.isFile( file );
      });
    });

    it('should write the parsed data to the .js file specified in the jsFile option, and then run the provided callback function', function() {
      var docs;
      var file = 'test/run-test.js';
      if ( fs.existsSync( file ) ) {
        fs.unlinkSync( file );
      }
      docs = doxray.run( 'test/test.css', { jsFile: file }, function() {
        assert.isFile( file );
      });
    });

    it('should throw an error if the first argument is a non existent file', function() {
      assert.throws(
        function() { doxray.run( [ 'non-existent-file.css' ] ); },
        Error
      );
    });
  });

  describe('parse()', function() {
    it('should parse the file given it into an array of structured objects if the first argument is a string', function() {
      assert.deepEqual(
        doxray.parse( 'test/test.css' ),
        [{
          prop1: 'Comment one',
          filename: 'test.css',
          css: ''
        }]
      );
    });

    it('should parse an array of files given it into an array of structured objects if the first argument is an array', function() {
      assert.deepEqual(
        doxray.parse( [ 'test/test.css', 'test/test.less' ], false ),
        [{
          prop1: 'Comment one',
          filename: 'test.css',
          css: ''
        },{
          prop1: 'Comment one',
          filename: 'test.less',
          less: ''
        }]
      );
    });

    it('should throw an error when the first argument is neither a string or an array', function() {
      assert.throws(
        function() { doxray.parse( {} ); },
        Error,
        doxray.parseGotWrongType
      );
      assert.throws(
        function() { doxray.parse( 123 ); },
        Error,
        doxray.parseGotWrongType
      );
    });
  });

  describe('parseOneFile()', function() {
    it('should parse a file into an array of structured objects', function() {
      assert.deepEqual(
        doxray.parseOneFile( 'test/test.css' ),
        [{
          prop1: 'Comment one',
          filename: 'test.css',
          css: ''
        }]
      );
    });

    it('should return an empty array if no Doxray comments are found', function() {
      assert.deepEqual(
        doxray.parseOneFile( 'test/empty-file.css' ),
        []
      );
    });
  });

  describe('getCommentType()', function() {
    it('should return the correct comment type based on the file extension', function() {
      assert.equal( doxray.getCommentType('test.css'), 'css' );
      assert.equal( doxray.getCommentType('test.less'), 'css' );
      assert.equal( doxray.getCommentType('test.less'), 'css' );
      assert.equal( doxray.getCommentType('test.html'), 'html' );
    });
  });

  describe('getFileContents()', function() {
    it('should return the contents of a file, trimming everything before the first doc comment', function() {
      assert.equal(
        doxray.getFileContents( 'test/test.css', doxray.regex.css ),
        '/* doxray\n    prop1: Comment one\n*/\n'
      );
    });
  });

  describe('convertYaml()', function() {
    it('should convert a yaml string into an object', function() {
      var yamlString = 'prop1: Comment one';
      assert.deepEqual( doxray.convertYaml( yamlString ), { prop1: 'Comment one' } );
    });

    it('identifies the comment number if the conversion fails', function() {
      assert.throws(
        function() { doxray.convertYaml( 'prop1: prop1:' ); },
        Error,
        'Error converting comment to YAML. Please check for formatting errors.'
      );
      assert.throws(
        function() { doxray.convertYaml( 'prop1: prop1:', 0 ); },
        Error,
        'Error converting comment #1 to YAML. Please check for formatting errors.'
      );
    });
  });

  describe('removeDoxrayCommentTokens()', function() {
    it('should remove the opening and closing comments from a doc comment', function() {
      assert.equal(
        doxray.removeDoxrayCommentTokens(
          '/* doxray\n    prop1: Comment one\n*/\n',
          doxray.regex.css
        ),
        '    prop1: Comment one\n\n'
      );
    });
  });

  describe('parseOutCode()', function() {
    it('should build an array of text blocks that come after each Doxray comment', function() {
      assert.deepEqual(
        doxray.parseOutCode(
          '/* doxray\n    prop1: Comment one\n*/\n.test{\n    content:\"Hello\";\n}',
          doxray.regex.css
        ),
        [ '.test{\n    content:\"Hello\";\n}' ]
      );
    });
  });

  describe('parseOutDocs()', function() {
    it('should build an array of structured objects from the contents of a file', function() {
      assert.deepEqual(
        doxray.parseOutDocs(
          '/* doxray\n    prop1: Comment one\n*/\n',
          doxray.regex.css
        ),
        [ { prop1: 'Comment one' } ]
      );
    });

    it('should return an empty array if the file has no Doxray comments', function() {
      assert.deepEqual(
        doxray.parseOutDocs( '', doxray.regex.css ),
        []
      );
    });
  });

  describe('joinDocsAndCode()', function() {
    it('should merge an array of converted Doxray comments with an array of the text that follows each comment', function() {
      var docs = [ { prop1: 'Comment one' } ];
      var code = [ '.test{\n    content:\"Hello\";\n}' ];
      var filename = 'test.css';
      assert.deepEqual(
        doxray.joinDocsAndCode( docs, code, filename ),
        [{
          prop1: docs[ 0 ].prop1,
          filename: filename,
          css: code[ 0 ]
        }]
      );
    });
  });

  describe('postParseProcessing()', function() {
    it('should send the parsed data through an array of processing functions', function() {
      doxray.processors = [
        function( parsed ) {
          parsed.patterns = [];
          parsed.customData = 'my custom data';
          return parsed;
        }
      ];
      assert.deepEqual(
        doxray.postParseProcessing( doxray.parse( 'test/test.css' ) ),
        {
          patterns: [],
          customData: 'my custom data'
        }
      );
      // We need to refresh the Doxray object because we deleted the processors.
      doxray = new Doxray();
    });

    describe('processors/slugify', function() {
      it('should slugify the label property in each pattern', function() {
        function run() {
          var parsed = doxray.postParseProcessing(
                doxray.parse( ['test/slugify-test.css', 'test/test.css'], false )
              );
          return parsed.patterns[0].slug + ' ' +
                 parsed.patterns[1].slug + ' ' +
                 parsed.patterns[2].slug + ' ' +
                 parsed.patterns[3].slug + ' ' +
                 parsed.patterns[4].slug + ' ' +
                 parsed.patterns[5].slug;
        }
        assert.equal(
          run(),
          'comment-one comment-two specialcharacters first-header second-header undefined'
        );
      });
    });

    describe('processors/color-palette', function() {
      it('should replace the colorPalette property with an array of key value pairs', function() {
        function run() {
          var parsed = doxray.postParseProcessing(
                doxray.parse( 'test/color-palette-test.scss' )
              );
          return [ parsed.patterns[0].colorPalette, parsed.patterns[1].colorPalette ];
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

    describe('getByProperty()', function() {
      it('passing one argument should return an array of patterns with the presence of a specific property', function() {
        function run() {
          var parsed = doxray.postParseProcessing(
                doxray.parse( ['test/slugify-test.css', 'test/test.css'], false )
              );
          return parsed.getByProperty( 'label' ).length;
        }
        assert.equal( run(), 5 );
      });

      it('passing two arguments should return an array of patterns with a specific property that matches a specific value', function() {
        function run() {
          var parsed = doxray.postParseProcessing(
                doxray.parse( ['test/slugify-test.css', 'test/test.css'], false )
              );
          return parsed.getByProperty( 'label', 'comment one' ).length;
        }
        assert.equal( run(), 1 );
      });
    });
  });

  describe('writeJSON()', function() {
    it('should create a .json file', function() {
      var file = 'test/test.json';
      if ( fs.existsSync( file ) ) {
        fs.unlinkSync( file );
      }
      doxray.writeJSON( { patterns: [] }, file, function() {
        assert.isFile( file );
      });
    });
  });

  describe('writeJS()', function() {
    it('should create a .js file', function() {
      var file = 'test/test.js';
      if ( fs.existsSync( file ) ) {
        fs.unlinkSync( file );
      }
      doxray.writeJS( {}, file, function() {
        assert.isFile( file );
      });
    });
  });

});

describe('Doxray alias', function() {

  describe('var doxray = require("../index.js") // when using as a node module you\'d use require("doxray")', function() {
    it('should parse the requested file into an array of pattern objects (this is a duplicate of the test used for the run() method)', function() {
      var doxray = require('../index');
      var docs;
      var file = 'test/run-test.js';
      if ( fs.existsSync( file ) ) {
        fs.unlinkSync( file );
      }
      docs = doxray( 'test/test.css', { jsFile: file }, function() {
        assert.isFile( file );
        assert.deepEqual(
          docs.patterns[0].prop1,
          'Comment one'
        );
      });
    });
  });

});


// describe('mergeParsedSources()', function() {
//   it('merges two objects if their docs are identical', function() {
//     assert.deepEqual(
//       doxray.parse( [ 'test/test.css', 'test/test.less' ], true ),
//       [
//         [
//           {
//             docs: { prop1: 'Comment one' },
//             code: [
//               {
//                 filename: 'test.css',
//                 type: '.css',
//                 code: ''
//               },
//               {
//                 filename: 'test.less',
//                 type: '.less',
//                 code: ''
//               }
//             ]
//           },
//         ]
//       ]
//     );
//     assert.deepEqual(
//       doxray.mergeParsedSources(
//         [
//           [
//             {
//               docs: { name: 'pattern one' },
//               code: [
//                 { code: 'test.css code', filename: 'test.css' }
//               ]
//             },
//             {
//               docs: { name: 'pattern two' },
//               code: [
//                 { code: 'test.css code', filename: 'test.css' }
//               ]
//             }
//           ],
//           [
//             {
//               docs: { name: 'pattern one' },
//               code: [
//                 { code: 'test.less code', filename: 'test.less' }
//               ]
//             },
//             {
//               docs: { name: 'pattern two' },
//               code: [
//                 { code: 'test.less code', filename: 'test.less' }
//               ]
//             }
//           ]
//         ]
//       ),
//       [
//         {
//           docs: { name: 'pattern one' },
//           code: [
//             { code: 'test.css code', filename: 'test.css' },
//             { code: 'test.less code', filename: 'test.less' }
//           ]
//         },
//         {
//           docs: { name: 'pattern two' },
//           code: [
//             { code: 'test.css code', filename: 'test.css' },
//             { code: 'test.less code', filename: 'test.less' }
//           ]
//         }
//       ]
//     );
//   });

//   it('when attempting to merge two', function() {
//     assert.deepEqual(
//       doxray.mergeParsedSources(
//         [
//           [
//             {
//               docs: { name: 'pattern name' },
//               code: [
//                 { code: 'test.css code', filename: 'test.css' },
//                 { code: 'test.less code', filename: 'test.less' }
//               ]
//             }
//           ],
//           [
//             {
//               docs: { name: 'a different pattern name' },
//               code: [
//                 { code: 'test.less code', filename: 'test.less' }
//               ]
//             }
//           ]
//         ]
//       ),
//       [
//         {
//           docs: { name: 'pattern name' },
//           code: [
//             { code: 'test.css code', filename: 'test.css' },
//             { code: 'test.less code', filename: 'test.less' }
//           ]
//         },
//         {
//           docs: { name: 'a different pattern name' },
//           code: [
//             { code: 'test.less code', filename: 'test.less' }
//           ]
//         }
//       ]
//     );
//   });
// });

// from "describes run()"
// it('merge', function() {
//   var docs = doxray.run( [ 'test/test.css', 'test/test.less' ], { merge: true } );
//   assert.deepEqual(
//     docs.patterns[0].prop1,
//     'Comment one'
//   );
// });
