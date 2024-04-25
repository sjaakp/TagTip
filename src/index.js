import './index.css';

function TagTip(elmt, options = {}) {
    this.settings = Object.assign({}, this.defaults, options, elmt.dataset);
    this._sanitizeSettings();

    const wrap = document.createElement('div'),
        list = document.createElement('ul'),
        suggest = document.createElement('ul');

    wrap.classList.add('tagtip-wrap');
    list.classList.add('tagtip-list');
    suggest.classList.add('tagtip-suggest');

    list.addEventListener('click', function (ev) {
        if (ev.target === this.list) {
            this._addNewTag();
        }
        else if (ev.target.classList.contains('tagtip-drop')) {
            this._addNewTag(ev.target.parentElement);
        }
        else if (ev.target.classList.contains('tagtip-tag')) {
            ev.target.setAttribute('contenteditable', 'true');
            ev.target.focus();
        }
        else if (ev.target.classList.contains('tagtip-delete')) {
            ev.target.parentElement.remove();
            this._listToElement();
        }
    }.bind(this));

    list.addEventListener('focusin', function(ev) {
        this.current = ev.target;
        // ev.target.setAttribute('contenteditable', 'true');
        this.suggest.style.left = (ev.target.parentElement.offsetLeft + 20) + 'px';
        console.log('focusin');
    }.bind(this));

    list.addEventListener('focusout', function (ev) {
        // this.current = null;
        if (ev.target.classList.contains('tagtip-tag')) {
            ev.target.removeAttribute('contenteditable', 'true');
            this._emptySuggest();
            if (ev.target.innerText === '') {
                ev.target.parentElement.remove();
            }
        }
        console.log('focusout', ev);
    }.bind(this));

    list.addEventListener('dragstart', function(ev) {
        this.dragfrom = ev.target;
        ev.target.classList.add('tagtip-dragged');
        console.log('dragstart', ev);
    }.bind(this));

    list.addEventListener('dragend', function(ev) {
        this.dragfrom.classList.remove('tagtip-dragged');
        this.dragfrom = null;
        console.log('dragend', ev);
    }.bind(this));

    list.addEventListener('dragover', function(ev) {
        ev.dataTransfer.dropEffect = this._canDrop(ev.target) ? 'move' : 'none';
        ev.preventDefault();
    }.bind(this));

    list.addEventListener('drop', function(ev) {
        ev.preventDefault();
        console.log('drop', ev, this.dragfrom);
        this.list.insertBefore(this.dragfrom, ev.target === this.list ? null : ev.target.parentElement);
        this._listToElement();
    }.bind(this));

    list.addEventListener('beforeinput', function(ev) {
        if (ev.inputType === 'insertType') {
            if (!this.settings.accept_space && ev.data === ' '
                || ev.data === this.settings.separator) {
                ev.preventDefault();
            }
        } else if (ev.inputType === 'insertParagraph')  {   // enter
            if (this.pick)  {
                this.current.innerText = this.pick.innerText;
                this._emptySuggest();
                this._listToElement();
            }
            this._focusNext();
            ev.preventDefault();
        }
        console.log('beforeinput', ev);
    }.bind(this));

    list.addEventListener('input', function(ev) {
        console.log('input', ev.target.innerText);
        const txt = ev.target.innerText;
        if (txt === '') {
            ev.target.parentElement.remove();
        } else {
            this._fetchSuggestions(txt);
        }
        this._listToElement();
    }.bind(this));

    list.addEventListener('keydown', function(ev) {
        console.log('keydown', ev, this.suggest);
        switch (ev.key) {
            case 'ArrowDown': {
                ev.preventDefault();
                if (this.pick === null) {
                    this.pick = this.suggest.firstElementChild;
                    this.pick.classList.add('tagtip-pick');
                } else if (this.pick !== this.suggest.lastElementChild) {
                    this.pick.classList.remove('tagtip-pick');
                    this.pick = this.pick.nextElementSibling;
                    this.pick.classList.add('tagtip-pick');
                }
                break;
            }
            case 'ArrowUp': {
                ev.preventDefault();
                if (this.pick === this.suggest.firstElementChild) {
                    this.pick.classList.remove('tagtip-pick');
                    this.pick = null;
                } else if (this.pick !== null) {
                    this.pick.classList.remove('tagtip-pick');
                    this.pick = this.pick.previousElementSibling;
                    this.pick.classList.add('tagtip-pick');
                }
                break;
            }
        }
    }.bind(this));

    suggest.addEventListener('click', function(ev) {
        console.log('click', ev);
        this.current.innerText = ev.target.innerText;
        this._emptySuggest();
        this._focusNext();
        this._listToElement();
    }.bind(this)),

    wrap.append(list, suggest);

    elmt.parentNode.insertBefore(wrap, elmt);

    elmt.tagtip = this;
    this.element = elmt;
    this.list = list;
    this.suggest = suggest;
    this.current = null;
    this.dragfrom = null;
    this.pick = null;

    this._elementToList();

    // this._fillSuggest([ 'one', 'two', 'three' ]);

    console.log(this);
}

TagTip.prototype = {

    defaults: {
        separator: ', ',
        max_tags: 6,
        accept_space: false,
        suggest_url: null
    },

    _sanitizeSettings() {
    },

    _elementToList()    {
        this.list.innerHTML = '';
        const tags = this.element.value.split(this.settings.separator).filter(e => !!e);  // empty text => empty list
        tags.splice(this.settings.max_tags);
        tags.forEach (v => { this.list.append(this._createTag(v)); });
    },

    _listToElement() {
        this.element.value = Array.from(this.list.children).map(e => e.innerText).filter(e => !!e).join(this.settings.separator);
    },

    // return: true if added, false if not (due to max_tags)
    _addNewTag (before = null) {
        if (this.list.childElementCount < this.settings.max_tags) {
            const li = this._createTag(''),
                tag = li.children[1];
            this.list.insertBefore(li, before);
            tag.setAttribute('contenteditable', 'true');
            tag.focus();
            return true;
        }
        return false;
    },

    _createTag(text)   {
        console.log('_createTag', text);
        const li = document.createElement('li'),
            drop = document.createElement('span'),
            tag = document.createElement('span'),
            del = document.createElement('span');

        drop.classList.add('tagtip-drop');
        tag.classList.add('tagtip-tag');
        tag.setAttribute('tabindex', '0');
        del.classList.add('tagtip-delete');

        tag.innerText = text;
        // tag.setAttribute('contenteditable', 'true');

        li.setAttribute('draggable', 'true');
        li.append(drop, tag, del);
        return li;
    },

    // return true if focused, false if not (due to max_tags)
    _focusNext() {
        console.log('_focusNext', this.current);
        const parent = this.current.parentElement;
        if (parent === this.list.lastElementChild) {
            return this._addNewTag();
        }
        const next = parent.nextElementSibling.children[1];
        next.setAttribute('contenteditable', 'true');
        next.focus();
        return true;
    },

    _fetchSuggestions(term)    {
        console.log('_fetchSuggestions', term);
        this._emptySuggest();
        if (this.settings.suggest_url)   {
            fetch(this.settings.suggest_url + '?term=' + term)
                .then(resp => resp.json())
                .then(words => this._fillSuggest(words));
        }
    },

    _fillSuggest(words) {
        this._emptySuggest();
        words.forEach((v) => {
            const li = document.createElement('li');
            li.innerText = v;
            this.suggest.append(li);
        });
    },

    _emptySuggest() {
        this.suggest.innerHTML = '';
        this.pick = null;
    },

    _canDrop(target) {
        const parent = target.parentElement;

        if (target === this.list) {
            return this.dragfrom !== this.list.lastElementChild;
        }
        return target.classList.contains('tagtip-drop')
            && parent !== this.dragfrom
            && parent !== this.dragfrom.nextElementSibling;
    }
}

window.tagtip = function(options = {}, selector = '.tagtip')   {
    return [...document.querySelectorAll(selector)].map(v => new TagTip(v, options));
}

