import WebComponent from './mixins/component';

export default class SelectionToolbar extends WebComponent {
  static template = ``;

  static style = `
    :host {
      border-radius: 4px;
    }
  `;

  static events = {
    selectionchange: 'onSelectionChange'
  };

  // Bubble down the selection change event so that the button can decide if it
  // should be visible or not.
  onSelectionChange(evt: CustomEvent) {
    let visibleElements = false;
    this.shadowRoot.childNodes.forEach(element => {
      let event = new CustomEvent(evt.type, { bubbles: false, cancelable: true, detail: evt.detail });
      element.dispatchEvent(event);
      if (!event.defaultPrevented) visibleElements = true;
    });
    console.log('visible elements?', visibleElements);
  }
}

if (!window.customElements.get('selection-toolbar')) {
  window.customElements.define('selection-toolbar', SelectionToolbar);
}
