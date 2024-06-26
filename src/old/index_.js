
import './index.scss';

function TagTip(elmt, options = {})
{
    this.settings = Object.assign({}, this.defaults, options);
    if (this.settings.suggestTrigger < 2) this.settings.suggestTrigger = 2;

    this.element = elmt;

    const editor = document.createElement('div'),
        suggestBox = document.createElement('div');
    editor.classList.add('tt-editor');
    suggestBox.classList.add('tt-suggs');
    suggestBox.setAttribute('tabindex', '-1');

    editor.addEventListener('pointerdown', function(ev) {
        console.log('pointerdown', this, ev);
        this.timer = setTimeout((tt) => {
            tt.editableOff();
            // tt.editor.setAttribute('contenteditable', false);
            tt.timer = 0;
        }, this.settings.preDragClick, this);
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
            this.editor.removeChild(ev.target);
            this.retrieveTags();
        }
        else console.log('click', this, ev);
    }.bind(this));

    editor.addEventListener('dragstart', function(ev) {
        console.log('dragstart', this, ev);
        this.draggedTag = ev.target;
        ev.dataTransfer.setData("text/plain", ev.target.innerText);
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
        this.draggedTag = null;
        this.editableOn();
        // this.editor.setAttribute('contenteditable', true);
        window.getSelection().removeAllRanges();
    }.bind(this));

    editor.addEventListener('drop', function(ev) {
        console.log('drop', this, ev);
        ev.target.classList.remove('tt-draggedover');
        if (ev.target === this.editor) this.editor.append(this.draggedTag);
        else ev.target.before(this.draggedTag);
        this.tags = this.retrieveTags();
    }.bind(this));

    editor.addEventListener('keydown', function(ev) {
        console.log('keydown', this, ev);
        if  (ev.key === 'ArrowDown' && this.suggestVisible)  {
            ev.preventDefault();
            this.suggestBox.focus();
            this.setActiveSuggestion(0);
        }
        else if (ev.key === 'Enter') {
            ev.preventDefault();
            this.setCaret(this.addTag(''));
        }
    }.bind(this));

    editor.addEventListener('input', function(ev) {
        const tags = this.retrieveTags(),
            tagId = tags.findIndex((t, i) => t !== (this.tags[i] || ''));
        this.tags = tags;
        if (tagId >= 0) {
            this.currentTag = this.editor.children[tagId];
            this.suggestBox.style.left = this.currentTag.offsetLeft + 'px';
            const term = this.currentTag.innerText;
            if (term.length >= this.settings.suggestTrigger)    {
                this.fetchSuggestions(term);
            }
            else this.hideSuggestions();
            console.log('input', tagId, term);
        }
        // else    {
        //     this.hideSuggestions();
        //     if (this.editor.lastElementChild.innerText === "\n")    {
        //         this.editor.lastElementChild.innerText = '';
        //     }
        // }
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
                this.currentTag.focus();
                break;
        }
    }.bind(this));

    this.element.append(editor, suggestBox);

    this.editor = editor;

    this.suggestBox = suggestBox;
    this.currentTag = null;
    this.draggedTag = null;
    this.timer = 0;
    this.tags = [];
    this.suggestVisible = false;
    this.activeSugg = -1;

    // this.setSuggestions([ 'alpha', 'beta', 'gamma', 'delta', 'alpha', 'beta', 'gamma', 'delta', 'alpha', 'beta', 'gamma', 'delta', ]);
    // this.fetchSuggestions('ar');

    this.editableOn();

    console.log(this);
}

TagTip.prototype = {

    defaults: {
        preDragClick: 500,
        maxTags: 12,
        suggestUrl: '/tag/suggest',
        maxSuggestions: 6,
        suggestTrigger: 2
    },

    fetchSuggestions(term)    {
        if (this.settings.suggestUrl)   {
            fetch(this.settings.suggestUrl + '?term=' + term)
                .then(resp => resp.json())
                .then(data => this.setSuggestions(data));
        }
    },

    setSuggestions(sugs)  {
        const divs = sugs.slice(0, this.settings.maxSuggestions).map(sug => {
            const div = document.createElement('div');
            div.classList.add('tt-sugg');
            div.innerText = sug;
            return div;
        });
        this.suggestBox.replaceChildren(...divs);
        this.showSuggestions();
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

    setCurrentTagText(text)   {
        this.currentTag.innerText = text;
        this.tags = this.retrieveTags();
        this.hideSuggestions();
        if (this.currentTag === this.editor.lastElementChild) this.addTag('');
        this.setCaret(this.currentTag?.nextElementSibling);
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


document.querySelectorAll('.tagtip').forEach((elmt) => {
    new TagTip(elmt);
});
