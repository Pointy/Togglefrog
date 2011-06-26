/*
Togglefrog.js
Copyright 2011 Mike McNally - All Rights Reserved

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function($, window, undefined) {

  var
    rbang = /^!/
  , rtrim = /^\s*(\S*)\s*$/
  , pageOptions = {}
  , WAS_CHECKED = 'togglefrog-was-checked'
  , MARKER = 'togglefrog-' + new Date().getTime()
  , MARKER_SELECTOR = '.' + MARKER
  ;

  function isUndef(v) {
    return typeof v === 'undefined';
  }

  // Fix option tags without "id" values
  function createOptionIds() {
    return this.each(function() {
      var sel = this, $sel = $(this);
      if (sel.tagName.toUpperCase === 'SELECT' && sel.id) {
        $sel.find('option').each(function() {
          if (this.id) return; // already has an id
          // we're not going to check for pre-existing id values, so 
          // it's a good idea to avoid the situation on your pages :-)
          this.id = sel.id + '-' + (this.value || $(this).text());
        });
      }
    });
  }

  function booleanData(key, whenUnset) {
    var value = this.data(key);
    return isUndef(value) ? whenUnset : value;
  }

  function findMine(selector) {
    var me = this[0];
    return this.find(selector).filter(function() {
      var $this = $(this), closest = $this.hasClass(MARKER) ? this : $this.closest(MARKER_SELECTOR)[0];
      return closest === me;
    });
  }

  // Main toggle setup routine. This plugin operates on selected
  // elements to be controlled by their toggles.
  function togglefrog(invocationOptions) {
    return this.each(function() {
      var
        toggled = this
      , $toggled = $(toggled)
      , toggledId = toggled.id
      , isSimple = $toggled.is('input, select, textarea')
      ;

      $toggled.addClass(MARKER);

      var options = $.extend({
        // The toggler expression. In the simplest (and common) case, this
        // should be just the "id" value of the checkbox, radio button, or
        // option element that controls whether the toggled element is "on"
        // or "off".  A checked checkbox or radio button, or a selected option,
        // means that the toggled element is "on".
        //
        // The toggler may also be a comma-separated list of "id" values,
        // which means that the toggled element is "on" only when *all*
        // the toggler elements are checked or selected.
        //
        // Finally, the toggler may be a semicolon-separated list of
        // comma-separated lists, which means that the toggled element should
        // be considered "on" when *any* of the toggler sub-lists are *all*
        // checked or selected.
        //
        toggler: $toggled.data('toggler') || null
        //
        // When the toggled element is "on", the "toggledClass" classes are
        // added, and the "untoggledClass" classes are removed.
        //
      , toggledClass: $toggled.data('toggledClass') || 'toggled'
      , untoggledClass: $toggled.data('untoggledClass') || 'untoggled'
        //
        // If "toggleDisable" is true, then when the toggled element is "off"
        // then all input, textarea, and select elements contained within it
        // are disabled.
        //
      , toggleDisable: $toggled.togglefrog_booleanData('toggleDisable', true)
        //
        // Function called when the toggled element is switched "off" by
        // the toggler.
        //
      , whenToggled: function() { return this; }
        //
        // Function called when the toggled element is switched "on" by
        // the toggler.
        //
      , whenUntoggled: function() { return this; }
        //
        // Class with which to mark toggler control elements
        //
      , togglerClass: 'toggler'
      }, pageOptions, invocationOptions);

      var
        // The "terms" of the toggler list - these are "or'ed" together
        terms = options.toggler.split(';')
        // List of objects representing the terms
      , togglerTerms = $.map(terms, function(term) {
          var
            // The "factors" of the toggler list - these are "anded" together
            factors = (function() {
              var ids = term.split(',');
              for (var i = 0; i < ids.length; ++i) ids[i] = ids[i].replace(rtrim, '$1');
              return ids;
            })()
          ;
          return {
              // list of jQuery objects wrapped around elements in the term
              // (the "factor" elements)
              togglers: (function() {
                var rv = [], id;
                for (var f = 0; f < factors.length; ++f) {
                  id = factors[f].replace(rbang, '');
                  rv.push({ id: id, element: document.getElementById(id), invert: factors[f].charAt(0) === '!' });
                }
                return rv;
              })()
              // function to determine whether this term is "on"
            , isOn: function() {
                var togglers = this.togglers;
                for (var f = 0; f < togglers.length; ++f) {
                  var
                    tobj = togglers[f]
                  , state = tobj.element.checked || tobj.element.selected
                  ;
                  if (tobj.invert ? state : !state) return false;
                }
                return true;
              }
          };
        })
      ;
      
      function isOn() {
        for (var t = 0; t < togglerTerms.length; ++t)
          if (togglerTerms[t].isOn()) return true;
        return false;
      }

      //
      // The event handler that'll be attached to all the
      // toggler control elements. If "justMe" is true,
      // then 
      //
      function toggleHandler(ev) {
        var on = isOn();

        if (isSimple) {
          toggled.disabled = options.toggleDisable && !on;
        }
        else {
          //
          // Disable inputs contained in the toggled element,
          // if the options indicate we should
          //
          if (options.toggleDisable) {
            $toggled
              [on ? 'togglefrog_findMine' : 'find']('input, select, textarea')
              .attr('disabled', !on)
            ;
          }

          //
          // Radio buttons that are toggled "off" may share "name"
          // attributes with radio buttons in other places! Oh
          // no!  Thus we need to make sure that when we toggle
          // them off, we save their "checked" status so that
          // when they toggle back into the active state we can
          // restore the state they were in previously.
          //
          if (on) {
            // Defer until after the smoke clears from this event
            setTimeout(function() {
              $toggled
                .togglefrog_findMine('input:radio').each( function() {
                  var
                    inp = this
                  , $inp = $(inp)
                  , checked = $inp.togglefrog_booleanData(WAS_CHECKED, !!$inp.togglefrog_booleanData('checked', !!$inp.attr('checked')))
                  ;
                  this.checked = checked;
                });
            }, 1);
          }
          else {
            $toggled
              .find('input:radio').each( function() {
                var
                  inp = this
                , $inp = $(inp)
                , checked = isUndef($inp.data(WAS_CHECKED)) ? $inp.togglefrog_booleanData('checked', inp.checked) : inp.checked
                ;
                $inp.data(WAS_CHECKED, checked);
                inp.checked = false;
              });
          }

          setTimeout(function() {
            //
            // If there are togglers *inside* a toggle section
            // that's toggled, we need to get them to re-jigger
            // themselves
            $toggled
              [on ? 'togglefrog_findMine' : 'find']('.' + options.togglerClass)
              .triggerHandler('togglefrog');
          }, 1);
        }

        //
        // Set/unset classes
        //
        $toggled
          [on ? 'addClass' : 'removeClass'](options.toggledClass)
          [on ? 'removeClass' : 'addClass'](options.untoggledClass)
        ;
        
        //
        // Call callbacks
        //
        var callback = options[on ? 'whenToggled' : 'whenUntoggled'];
        if (callback) callback.call(this, on, options);
      };

      //
      // Iterate through the term objects setting up event
      // handlers etc.
      //
      $.each(togglerTerms, function(_, term) {
        //
        // Bind the handler to the togglers.
        //
        $.each(term.togglers, function(_, toggler) {
          if (!toggler.element)
            throw 'Togglefrog cannot find toggler "' + toggler.id + '"!';

          var
            isOption = toggler.element.tagName.toUpperCase === 'OPTION'
          , $toggler = $(toggler.element)
          , eventsToBind = 
              isOption ?
                (toggledId ? ('blur.' + toggledId + ' change.' + toggledId + ' togglefrog.' + toggledId) : 'blur change togglefrog') :
                (toggledId ? ('click.' + toggledId + ' togglefrog.' + toggledId) : 'click togglefrog')
          , unbindIfNecessary = toggledId ? function() { $(this).unbind(eventsToBind); } : function() {}
          , $eventTargets =
              isOption ? $toggler.closes('select') :
              $toggler.is('input:radio') ? $('input:radio[name=' + toggler.element.name + ']') :
              $toggler.is('input:checkbox') ? $toggler :
              null
          ;

          if (!$eventTargets)
            throw 'Togglefrog toggler element "' + toggler.id + '" is not a select, radio button, or checkbox!';

          $eventTargets
            .addClass(options.togglerClass)
            .each(unbindIfNecessary)
            .bind(eventsToBind, toggleHandler)
            .triggerHandler('togglefrog');
        });
      });
    });
  }

  //
  // If the body has class 'togglefrog', look for elements
  // on the page with that class and do our thing.
  $(function() {
    $('body.togglefrog').find('.togglefrog').togglefrog();
  });

  $.fn.togglefrog = togglefrog;
  
  $.fn.togglefrog_fixOptions = createOptionIds;
  $.fn.togglefrog_booleanData = booleanData;
  $.fn.togglefrog_findMine = findMine;

  $.togglefrog = function(options) { pageOptions = options; };

})(jQuery, window);
