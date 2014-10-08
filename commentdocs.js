/* ==========================================================================
   Parse documentation from code comments.
   ========================================================================== */

var CommentDocs = function() {
  //
};

CommentDocs.prototype.regex = {
  html: {
    opening: /<!--\s*topdoc[^\n]*\n/,
    closing: /-->/,
    comment: /<!--\s*topdoc(?:[^-]|[\r\n]|-[^-])*-->/g
  },
  css: {
    opening: /\/\*\s*topdoc[^\n]*\n/,
    closing: /\*\//,
    comment: /\/\*\s*topdoc[^*]*\*+(?:[^/*][^*]*\*+)*\//g
  }
};

CommentDocs.prototype.parseSourceFile = function( src ) {
  var fileContents, docs, code, convertedDocs, ext;
  // Get the file extension for src so we know which regex to use.
  ext = this.getCommentType( src );
  fileContents = this.getFileContents( src, this.regex[ ext ] );
  docs = this.parseOutDocs( fileContents, this.regex[ ext ] );
  code = this.parseOutCode( fileContents, this.regex[ ext ] );
  if ( this.parsingIsValid( docs, code ) ) {
    // Join the docs and code back together as structured objects.
    convertedDocs = this.joinDocsAndCode( docs, code );
  }
  return convertedDocs;
};

CommentDocs.prototype.joinDocsAndCode = function( docs, code ) {
  var convertedDocs;
  convertedDocs = [];
  // Create an array of objects. Each object contains a docs and code property
  // which represent the parsed doc comment object and the code that follows it
  // in the source.
  docs.forEach(function( item, index ){
    convertedDocs.push({
      docs: docs[ index ],
      code: code[ index ]
    });
  });
  return convertedDocs;
};

CommentDocs.prototype.parseOutCode = function( fileContents, regex ) {
  var code;
  // The "code" is everything betwixt the regex.
  code = fileContents.split( regex.comment );
  // Removes the first item in the array since it will always be empty.
  code.shift();
  // Clean each item in the array.
  code.forEach(function( item, index ){
    code[ index ] = code[ index ].trim();
  });
  return code;
};

CommentDocs.prototype.parseOutDocs = function( fileContents, regex ) {
  var docs;
  // "docs" are anything that matches the regex.
  docs = fileContents.match( regex.comment );
  docs.forEach(function( item, index ){
    // Grab the doc text from the comments.
    docs[ index ] = this.getTextFromDocComment( item, regex );
    // Conver it from YAML into a JavaScript object.
    docs[ index ] = this.convertYaml( docs[ index ], index );
  }, this );
  return docs;
};

CommentDocs.prototype.convertYaml = function( yamlString, index ) {
  var yaml, convertedYaml, yamlError;
  yaml = require('js-yaml');
  // Try converting the doc to YAML and warn if it fails.
  try {
    convertedYaml = yaml.safeLoad( yamlString );
  } catch ( e ) {
    yamlError = 'Error converting comment # to YAML. Please check for formatting errors.';
    if ( index !== undefined ) {
      yamlError = yamlError.replace( '#', '#' + (index+1) );
    } else {
      yamlError = yamlError.replace( '# ', '' );
    }
    // TODO: A node.js equivalent to Grunts this.async();
    throw new Error( yamlError );
  }
  return convertedYaml;
};

CommentDocs.prototype.parsingIsValid = function( docs, code ) {
  // For each doc comment ther should be one correcsponding code snippet.
  // This checks to make sure the doc and code arrays have the same length.
  if ( docs.length !== code.length ) {
    // TODO: A node.js equivalent to Grunts this.async();
    throw new Error('Parsing failed because the number of parsed doc comments does not match the number of parsed code snippets.');
  } else {
    return true;
  }
};

CommentDocs.prototype.getTextFromDocComment = function( item, regex ) {
  // Remove the opening and closing comments.
  return item.replace( regex.opening, '' ).replace( regex.closing, '' );
};

CommentDocs.prototype.getFileContents = function( src, regex ) {
  var fs, data;
  fs = require('fs-extra');
  data = fs.readFileSync( src, 'utf-8' );
  // Trim everything before the first regex because it's not associated with
  // any comment.
  data = data.slice( data.search( regex.comment ) );
  return data;
};

CommentDocs.prototype.getCommentType = function( src ) {
  var path = require('path');
  var ext;
  ext = path.extname( src ).substring( 1 );
  switch ( ext ) {
    case 'css':
    case 'less':
      ext = 'css';
      break;
    case 'html':
      ext = 'html';
      break;
    default:
      ext = 'css';
  }
  return ext;
};

module.exports = CommentDocs;