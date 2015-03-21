/**
 * Customizer for Layout Config XML files
 *
 * Called by the FileView for text/xml files to see if it is a layout config file
 * and if it is return an action to be performed on the area of the file where
 * the mouse is.
 *
 * This permits 'hotspots' on the file where the user can click to load a another resource
 * or making areas of the file disabled (handles that are not used for example) 
 *
 * @module layoutfilecustomizer
 * @author Bob Davison
 * @version 1.0
 */
define(['class', 'layoutfileparser'],

function(Class, LayoutFileParser) {

    return Class.create({

        constructor: fucntion(resourceLoader, layoutModel) {
            this.parser = new LayoutFileParser(resourceLoader, layoutModel);
        },

        setTokens: function(iterator) {
            this.actions = this.parser.parse(iterator);
        },

        getAction: function(token, pos) {
            var action = this.findAction(pos);
            // TODO: is this test necesary? Why can't we return any found action?
            if(action) {
                if(action.type === 'block' || token.type === 'string.attribute-value.xml') {
                    return action;
                }
            }
        },

        findAction: function(pos) {
            var row = pos.row;
            var rowActions = this.actions[row];
            if(rowActions) {
                var col = pos.column;
                var len = rowActions.length;
                for(var i = 0 ; i < len ; i++) {
                    var action = rowActions[i];
                    // Block actions only have to be on correct row
                    if(action.type === 'block') {
                        return action;
                    }
                    // Odd token recognition by Ace editor
                    // We have to allow extra column at
                    // the end but not at the beginning
                    if(col > action.col2 + 1) {
                        continue;
                    } else if(col >= action.col1) {
                        return action;
                    } else {
                        break;
                    }
                }
            }
        },

    });
});
