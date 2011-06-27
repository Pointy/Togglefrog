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
  , CHECKED = 'checked'
  , WAS_CHECKED = 'togglefrog-waschecked'
  , MARKER = 'togglefrog-' + new Date().getTime()
  , MARKER_SELECTOR = '.' + MARKER
  , TOGGLE_STATUS = 'togglefrog-status'
  , TOGGLERS = 'togglefrog-togglers'
  , OPTIONS = 'togglefrog-options'
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

  //
  // return true if the element is untoggled ("off")
  // or if any parent is untoggled
  function isUntoggled() {
    var
      $element = $(this[0]) 
    , $parents = $element.parents().andSelf()
    , status = null
    ;
    for (var i = 0; i < $parents.length; ++i) {
      if ($($parents[i]).data(TOGGLE_STATUS) === false) return true;
    }
    return false;
  }

  function noData(key) { return typeof this.data(key) === 'undefined'; }

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
      , toggledClass: $toggled.data('toggledclass') || 'toggled'
      , untoggledClass: $toggled.data('untoggledclass') || 'untoggled'
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

      $toggled.data(OPTIONS, options);

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

      //////////////////////////////////////////////////////////////////////////////
      //
      // The event handler that'll be attached to all the
      // toggler control elements. If "justMe" is true,
      // then 
      //
      function toggleHandler(ev) {
        var
          toggler = this
        , $toggler = $(toggler)
        , on = isOn()
        , reallyOn = null
        , deferred = []
        , isRadio = this.type.toLowerCase() === 'radio'
        ;
        
        $toggled.data(TOGGLE_STATUS, on);
        reallyOn = on && !$toggled.togglefrog_isUntoggled()
        ;
        //
        // Set/unset classes
        //
        $toggled.find(MARKER_SELECTOR).andSelf().each(function() {
          var $this = $(this), reallyOn = on && !$this.togglefrog_isUntoggled();
          $this
            [reallyOn ? 'addClass' : 'removeClass']($(this).data(OPTIONS).toggledClass)
            [reallyOn ? 'removeClass' : 'addClass']($(this).data(OPTIONS).untoggledClass)
          ;
        });
        
        if (isSimple) {
          toggled.disabled = options.toggleDisable && !reallyOn;
        }
        else {
          //
          // Disable inputs contained in the toggled element,
          // if the options indicate we should
          //
          if (options.toggleDisable) {
            $toggled.find('input, select, textarea').each(function() {
              var
                $this = $(this)
              , on = reallyOn && !$this.togglefrog_isUntoggled()
              ;
              this.disabled = !on;
              if (this.type.toLowerCase() === 'radio') {
                // Radio buttons require special handling.
                // We have to make sure that we're done switching
                // buttons off before we switch any back on,
                // because they affect each other.
                if (on) {
                  deferred.push($.proxy(function() {
                    this.checked = $this.data(WAS_CHECKED);
                  }, this));
                }
                else {
                  $this.data(WAS_CHECKED, !!this.checked);
                  this.checked = false;
                }
              }
            });
          }
          //
          // If there are togglers or toggled sections *inside*
          // a toggle section that's toggled, we need to get them
          // to re-jigger themselves.  This has to be deferred
          // because the reset of radio buttons after a switch
          // "on" is itself deferred.
          $toggled
            .find('.' + options.togglerClass).each(function() {
              deferred.push($.proxy(function() {
                $(this).triggerHandler('togglefrog');
              }, this));
            })
            .find(MARKER_SELECTOR).each(function() {
              deferred.push($.proxy(function() {
                $(this).data(TOGGLERS).triggerHandler('togglefrog');
              }, this));
            })
          ;
        }

        //
        // Call callbacks
        //
        var callback = options[on ? 'whenToggled' : 'whenUntoggled'];
        if (callback) callback.call(toggled, on, options);

        //
        // Arrange for deferred processing
        if (deferred.length)
          setTimeout(function() {
            for (var d = 0; d < deferred.length; ++d)
              deferred[d]();
          }, 1);

        if (on) {
          // Set up a timeout to run after the other deferred
          // functions to check on the state of radio buttons.
          // If there are any groups of radio buttons for
          // which no toggled ("on") buttons are checked, then
          // we need to check any that have "data-checked" set
          setTimeout(function() {
            var
              radios = $toggled.find('input:radio').filter(function() {
                return !$(this).togglefrog_isUntoggled();
              }).get()
            , groups = (function() {
                var rv = { names: [], buttons: {} };
                for (var i = 0; i < radios.length; ++i) {
                  var list = rv.buttons[radios[i].name];
                  if (!list) {
                    list = rv.buttons[radios[i].name] = [];
                    rv.names.push(radios[i].name);
                  }
                  list.push(radios[i]);
                }
                return rv;
              })()
            ;
            for (var i = 0; i < groups.names.length; ++i) {
              var checked = false, buttons = groups.buttons[groups.names[i]];
              for (var j = 0; j < buttons.length; ++j)
                checked = checked || buttons[j].checked;
              if (!checked) {
                for (var j = 0; j < buttons.length; ++j) {
                  buttons[j].checked = $(buttons[j]).data(CHECKED);
                }
              }
            }
          }, 5);
        }
      };

      //
      // Iterate through the term objects setting up event
      // handlers etc.
      //
      var togglerElements = [];
      $.each(togglerTerms, function(_, term) {
        //
        // Bind the handler to the togglers.
        //
        $.each(term.togglers, function(_, toggler) {
          if (!toggler.element)
            throw 'Togglefrog cannot find toggler "' + toggler.id + '"!';

          var
            isOption = toggler.element.tagName.toUpperCase() === 'OPTION'
          , $toggler = $(toggler.element)
          , eventsToBind = 
              isOption ?
                (toggledId ? ('blur.' + toggledId + ' change.' + toggledId + ' togglefrog.' + toggledId) : 'blur change togglefrog') :
                (toggledId ? ('click.' + toggledId + ' togglefrog.' + toggledId) : 'click togglefrog')
          , unbindIfNecessary = toggledId ? function() { $(this).unbind(eventsToBind); } : function() {}
          , $eventTargets =
              isOption ? $toggler.closest('select') :
              $toggler.is('input:radio') ? $('input:radio[name=' + toggler.element.name + ']') :
              $toggler.is('input:checkbox') ? $toggler :
              null
          ;

          togglerElements.push(toggler.element);

          if (!$eventTargets)
            throw 'Togglefrog toggler element "' + toggler.id + '" is not an option, radio button, or checkbox!';

          $eventTargets
            .addClass(options.togglerClass)
            .each(unbindIfNecessary)
            .bind(eventsToBind, toggleHandler)
            .triggerHandler('togglefrog');
        });
      });

      $toggled.data(TOGGLERS, $().add(togglerElements));
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
  $.fn.togglefrog_isUntoggled = isUntoggled;
  $.fn.togglefrog_noData = noData;

  $.togglefrog = function(options) { pageOptions = options; };

})(jQuery, window);
