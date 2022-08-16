import './index.scss';

function TagTip(elmt, options = {})
{
    this.settings = Object.assign({}, this.defaults, options);
    for (const [k, v] of Object.entries(this.settings)) {
        if (elmt.dataset[k]) this.settings[k] = elmt.dataset[k];
    }
    if (this.settings.suggest_trigger < 1) this.settings.suggest_trigger = 1;


    this.element = elmt;

    const editor = document.createElement('div'),
        suggestBox = document.createElement('div');
    editor.classList.add('tt-editor');
    editor.setAttribute('contenteditable', true);
    suggestBox.classList.add('tt-suggs');
    suggestBox.setAttribute('tabindex', '-1');

    editor.addEventListener('pointerdown', function(ev) {
        console.log('pointerdown', this, ev);
        this.setActiveTag(ev.target === this.editor ? this.editor.lastElementChild : ev.target);
        this.timer = setTimeout((tt) => {
            tt.editableOff();
            tt.timer = 0;
        }, this.settings.predrag, this);
    }.bind(this));

    editor.addEventListener('pointerup', function(ev) {
        console.log('pointerup', this, ev);
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = 0;
        }
    }.bind(this));

    editor.addEventListener('click', function(ev) {
        if (ev.offsetX > ev.target.offsetWidth - 16) {
            console.log('close', this, ev);
            const newActive = ev.target.nextElementSibling;
            this.editor.removeChild(ev.target);
            this.setActiveTag(newActive);
            this.tags = this.retrieveTags();
        }
        else console.log('click', this, ev);
    }.bind(this));

    editor.addEventListener('dragstart', function(ev) {
        console.log('dragstart', this, ev);
        // this.draggedTag = ev.target;
        ev.dataTransfer.setData("text/plain", this.activeTag.innerText);
        // ev.dataTransfer.setData("text/plain", ev.target.innerText);
    }.bind(this));

    editor.addEventListener('dragenter', function(ev) {
        console.log('dragenter', this, ev);
        ev.preventDefault();
        ev.target.classList.add('tt-draggedover');
    }.bind(this));

    editor.addEventListener('dragover', function(ev) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
    }.bind(this));

    editor.addEventListener('dragleave', function(ev) {
        console.log('dragleave', this, ev);
        ev.preventDefault();
        ev.target.classList.remove('tt-draggedover');
    }.bind(this));

    editor.addEventListener('dragend', function(ev) {
        console.log('dragend', this, ev);
        // this.draggedTag = null;
        this.editableOn();
        // this.editor.setAttribute('contenteditable', true);
        window.getSelection().removeAllRanges();
    }.bind(this));

    editor.addEventListener('drop', function(ev) {
        console.log('drop', this, ev);
        ev.target.classList.remove('tt-draggedover');
        if (ev.target === this.editor) this.editor.append(this.activeTag);
        else ev.target.before(this.activeTag);
        // if (ev.target === this.editor) this.editor.append(this.draggedTag);
        // else ev.target.before(this.draggedTag);
        this.tags = this.retrieveTags();
    }.bind(this));

    editor.addEventListener('keydown', function(ev) {
        console.log('keydown', this, ev);   // note: ev.target is always this.editor, NOT a tag
        if  (ev.key === 'ArrowDown' && this.suggestVisible)  {
            ev.preventDefault();
            this.suggestBox.focus();
            this.setActiveSuggestion(0);
        }
        else if (ev.key === 'Enter') {
            ev.preventDefault();
            this.setActiveTag(this.activeTag.nextElementSibling);
            this.setCaret(this.activeTag);
            // this.setCaret(this.addTag(''));
        }
        else if (ev.key === 'Tab')  {
            if (ev.shiftKey && this.activeTag !== this.editor.firstElementChild)    {
                ev.preventDefault();
                this.setActiveTag(this.activeTag.previousElementSibling);
            }
            else if (!ev.shiftKey && this.activeTag !== this.editor.lastElementChild)    {
                ev.preventDefault();
                this.setActiveTag(this.activeTag.nextElementSibling);
            }
        }
    }.bind(this));

    editor.addEventListener('input', function(ev) {
        console.log('input', this, ev);
        const tags = this.retrieveTags(),   // new tags
            tagId = tags.findIndex((t, i) => t !== (this.tags[i] || ''));   // compare with old
        this.tags = tags;   // keep new
        if (tagId >= 0) {   // difference found
            const t = this.editor.children[tagId];
            this.setActiveTag(t);
            if (t === this.editor.lastElementChild) this.addTag('');
            // this.currentTag = this.editor.children[tagId];
            this.suggestBox.style.left = this.activeTag.offsetLeft + 'px';
            // this.suggestBox.style.left = this.currentTag.offsetLeft + 'px';
            const term = this.activeTag.innerText;
            // const term = this.currentTag.innerText;
            if (term.length >= this.settings.suggest_trigger)    {
                this.fetchSuggestions(term);
            }
            else this.hideSuggestions();
            // console.log('input', tagId, term);
        }


        // else    {
        //     this.hideSuggestions();
        //     if (this.editor.lastElementChild.innerText === "\n")    {
        //         this.editor.lastElementChild.innerText = '';
        //     }
        // }
    }.bind(this));

    editor.addEventListener('focus', function(ev) {
        this.setCaret(this.activeTag);
    }.bind(this));

    suggestBox.addEventListener('click', function(ev) {
        console.log('suggest click', ev.target.innerText);
        this.setActiveTagText(ev.target.innerText);
    }.bind(this));

    suggestBox.addEventListener('keydown', function(ev) {
        console.log('suggest keydown', ev.target.innerText);
        let i = this.activeSugg;
        switch (ev.key) {
            case 'ArrowDown':
                ev.preventDefault();
                i++;
                if (i >= this.suggestBox.childElementCount) i = 0;
                this.setActiveSuggestion(i);
                break;
            case 'ArrowUp':
                ev.preventDefault();
                i--;
                if (i < 0) i = this.suggestBox.childElementCount - 1;
                this.setActiveSuggestion(i);
                break;
            case 'Enter':
                ev.preventDefault();
                this.setActiveTagText(this.suggestBox.children[i].innerText);
                this.editor.focus();
                // this.currentTag.focus();
                break;
        }
    }.bind(this));

    const initTags = elmt.innerText;
    elmt.innerHTML = '';    // clear, not really needed

    this.element.append(editor, suggestBox);

    this.editor = editor;

    this.suggestBox = suggestBox;
    this.activeTag = null;
    // this.currentTag = null;
    // this.draggedTag = null;
    this.timer = 0;
    this.tags = [];
    this.suggestVisible = false;
    this.activeSugg = -1;

    this.setTags(initTags);
    // this.setSuggestions([ 'alpha', 'beta', 'gamma', 'delta', 'alpha', 'beta', 'gamma', 'delta', 'alpha', 'beta', 'gamma', 'delta', ]);
    // this.fetchSuggestions('ar');

    console.log(this, editor.innerText);
}

TagTip.prototype = {

    defaults: {
        separator: ',',         // separator character
        predrag: 500,           // millisecs before switching to drag & dropmode
        max_tags: 12,            // maximum number of tags
        suggest_url: null, // url for fetching suggestions
        max_suggestions: 6,      // maximum number of fetches
        suggest_trigger: 2       // minimum number of characters to show suggestions
    },

    setTags(text)   {
        this.tags = text.split(this.settings.separator).filter(e => !!e);  // empty text => empty list
        this.editor.innerHTML = '';     // clear
        this.tags.forEach (v => { this.addTag(v); });
        this.setActiveTag(this.addTag(''));    // always an empty tag at the end
    },

    getTags()   {
        return this.tags.join(this.settings.separator);
    },

    setActiveTag(tag = null)    {
        if (this.activeTag)   {
            this.activeTag.classList.remove('tt-active');
        }
        this.activeTag = tag;
        if (tag)   {
            tag.classList.add('tt-active');
        }
        this.setCaret(tag);
    },

    fetchSuggestions(term)    {
        if (this.settings.suggest_url)   {
            fetch(this.settings.suggest_url + '?term=' + term)
                .then(resp => resp.json())
                .then(data => this.setSuggestions(data));
        }
    },

    setSuggestions(sugs)  {
        const divs = sugs.slice(0, this.settings.max_suggestions).map(sug => {
            const div = document.createElement('div');
            div.classList.add('tt-sugg');
            div.innerText = sug;
            return div;
        });
        if (divs.length)    {
            this.suggestBox.replaceChildren(...divs);
            this.showSuggestions();
        }
        else this.hideSuggestions();
    },

    hideSuggestions() {
        this.suggestBox.classList.remove('tt-show');
        this.suggestVisible = false;
        this.activeSugg = -1;
    },

    showSuggestions() {
        this.suggestBox.classList.add('tt-show');
        this.suggestVisible = true;
    },

    setActiveTagText(text)   {
        this.activeTag.innerText = text;
        // this.currentTag.innerText = text;
        this.tags = this.retrieveTags();
        this.hideSuggestions();
        this.setActiveTag(this.activeTag.nextElementSibling);
        // if (this.currentTag === this.editor.lastElementChild) this.addTag('');
        // this.setCaret(this.currentTag?.nextElementSibling);
    },

    retrieveTags() {
        return this.editor.innerText.split("\n").filter(w => w.length > 0);
    },

    addTag(text)   {
        console.log('addTag', this);
        const div = document.createElement('div');
        div.setAttribute('draggable', true);
        div.classList.add('tt-tag');
        div.innerText = text;
        this.editor.append(div);
        return div;
    },

    editableOn()  {
        this.editor.setAttribute('contenteditable', true);
        this.addTag('');
    },

    editableOff()  {
        this.editor.setAttribute('contenteditable', false);
        const div = this.editor.lastElementChild;
        if (div) this.editor.removeChild(div);
    },

    setCaret(tag, pos = 0)    {
        if (tag)    {
            const range = document.createRange();
            range.setStart(tag, pos);
            range.collapse(true);

            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(range)
        }
    },

    // id == -1 => none active
    setActiveSuggestion(id)   {
        if (this.activeSugg >= 0)   {
            this.suggestBox.children[this.activeSugg].classList.remove('tt-active');
        }
        if (id >= 0)   {
            this.activeSugg = id;
            this.suggestBox.children[id].classList.add('tt-active');
        }
    }
};


window.tagtip = function(options = {}, selector = '.tagtip')   {
    document.querySelectorAll(selector).forEach((elmt) => {
        new TagTip(elmt, options);
    });
}

/*

document.querySelectorAll('.tagtip').forEach((elmt) => {
    new TagTip(elmt);
});
*/
