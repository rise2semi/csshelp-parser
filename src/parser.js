'use strict';

var fs = require('fs');

/**
 * Constructor
 * @param {{ styles: string, src: string, templates: object }} options
 * @property {{ categoryBlock: string, fileBlock: string, fileTemplate: string }} options.templates
 * @constructor
 */
function Parser( options ) {
    this.styles = options.styles;
    this.src = options.src;
    this.template = options.templates;

    /**
     * Container for content
     */
    this.fileContent = {
        'General': ''
    };
}

/**
 * Parse source file
 */
Parser.prototype.getSrcContent = function () {
    return fs.readFileSync( this.src, { encoding: 'utf8' } );
};

/**
 * Parse all comments in source file
 */
Parser.prototype.parseComments = function ( srcContent ) {
    return srcContent.match(/(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(\/\/.*)/g);
};

/**
 * Get title option
 */
Parser.prototype.getTitle = function ( commentContent ) {
    var title = commentContent.match(/@title([\s\S]*?)(?=@group|@example|@code|$)/);

    return ( title && title[1] ) ? title[1].replace(/\r\n.*\*/g, '\r\n').trim() : null;
};

/**
 * Get group option
 */
Parser.prototype.getGroup = function ( commentContent ) {
    var group = commentContent.match(/@group([\s\S]*?)(?=@code|@title|@example|$)/);

    return ( group && group[1] ) ? group[1].replace(/\r\n.*\*/g, '\r\n').trim() : null;
};

/**
 * Get code option
 */
Parser.prototype.getCode = function ( commentContent ) {
    var code = commentContent.match(/@code([\s\S]*?)(?=@group|@title|@example|$)/);

    return ( code && code[1] ) ? code[1].replace(/\r\n.*\*/g, '\r\n').trim() : null;
};

/**
 * Get example option
 */
Parser.prototype.getExample = function ( commentContent ) {
    var example = commentContent.match(/@example([\s\S]*?)(?=@group|@title|@code|$)/);

    return ( example && example[1] ) ? example[1].replace(/\r\n.*\*/g, '\r\n').trim() : null;
};

/**
 * Go throw all comments to find content for documentation file
 */
Parser.prototype.iterateComments = function ( comments ) {
    comments.forEach(function ( comment ) {

        /**
         * Skip comments without @csshelp label
         */
        if ( comment.indexOf('@csshelp') === -1 ) {
            return;
        }

        var commentContent = comment.replace(/\/\*/, '').replace(/\*\//, '').trim();

        var title = this.getTitle( commentContent );
        var example = this.getExample( commentContent );
        var code = this.getCode( commentContent );
        var group = this.getGroup( commentContent ) || 'General';

        /**
         * Exclude examples without @title or @example
         */
        if ( !title || !example ) {
            return;
        }

        if ( !this.fileContent[ group ] ) {
            this.fileContent[ group ] = '';
        }

        function prepareCodeExample( code ) {
            return code.replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .split('\r\n')
                .map( function( line ) { return '<li>' +  line + '</li>'; })
                .join('\r\n');
        }

        this.fileContent[ group ] += this.template.fileBlock
            .replace('{{title}}', title )
            .replace('{{visible}}', (( group === 'General' ) ? 'block' : 'none') )
            .replace('{{link}}', group.toLowerCase() )
            .replace('{{code}}', (( code )
                    ? prepareCodeExample( code )
                    : prepareCodeExample( example )
            ))
            .replace('{{example}}', example );

    }.bind( this ));
};

/**
 * Process source
 * @param {object} config
 * @param {function} callback
 */
Parser.prototype.process = function ( config, callback ) {
    var srcContent = this.getSrcContent();
    var comments = this.parseComments( srcContent );

    this.iterateComments( comments );
    this.save( config );

    callback();
};

/**
 * Save generated file
 * @param {{ generatedFile: string }} config
 */
Parser.prototype.save = function ( config ) {
    var generatedContent = '';
    var categoriesContent = '';

    for ( var group in this.fileContent ) {
        if ( !this.fileContent.hasOwnProperty( group ) ) {
            return
        }

        categoriesContent += this.template.categoryBlock
            .replace('{{title}}', group )
            .replace('{{link}}', group.toLowerCase() );

        generatedContent += this.fileContent[ group ];
    }

    /**
     * Add content into template
     */
    var generatedFile = this.template.fileTemplate
        .replace('{{include}}', this.styles )
        .replace('{{categories}}', categoriesContent )
        .replace('{{content}}', generatedContent );

    fs.writeFileSync( config.generatedFile, generatedFile );
};

module.exports = Parser;
