/* Copyright (C) 2011 Ben Trask. All rights reserved. */
var DOM = {
    id: function(id) { return document.getElementById(id); },
    clone: function(id, childByID) {
        var element = document.getElementById(id).cloneNode(true);
        element.id = "";
        if (childByID)
            (function findIDsInElement(elem) {
                var children = elem.childNodes, length = children.length, i = 0, dataID;
                if (elem.getAttribute)
                    dataID = elem.getAttribute("data-id");
                if (dataID)
                    childByID[dataID] = elem;
                for (; i < length; ++i)
                    findIDsInElement(children[i]);
            })(element);
        return element;
    },
    classify: function(elem, className, add) {
        var classes = (elem.className || "").split(" "), 
        changed = (className || "").split(" "), 
        length = changed.length, i = 0, index;
        if (add || undefined === add)
            for (; i < length; ++i) {
                index = classes.indexOf(changed[i]);
                if (index < 0)
                    classes.push(changed[i]);
            }
        else
            for (; i < length; ++i) {
                index = classes.indexOf(changed[i]);
                if (index >= 0)
                    classes.splice(index, 1);
            }
        elem.className = classes.join(" ");
    },
    fill: function(elem, child1, child2, etc) {
        var i = 1, type;
        while (elem.hasChildNodes())
            elem.removeChild(elem.firstChild);
        for (; i < arguments.length; ++i)
            if (arguments[i]) {
                type = typeof arguments[i];
                if ("string" === type || "number" === type) {
                    elem.appendChild(document.createTextNode(arguments[i]));
                } else {
                    elem.appendChild(arguments[i]);
                }
            }
    },
    remove: function(elem) {
        if (elem.parentNode)
            elem.parentNode.removeChild(elem);
    }
};
