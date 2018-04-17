import events from './mixins/events';

type Constructor<T = {}> = new (...args: any[]) => T;

const supports = {
  beforeinput: InputEvent.prototype.hasOwnProperty('inputType')
};

function getRangeFrom() {

}

// n.b. this is duplicated from text-selection and should be refactored to be
// included from a shared base.
const TEXT_NODE_TYPE = 3;

function getTextNodes(node: Node): Text[] {
  let nodes: Text[] = [];

  if (node.hasChildNodes()) {
    node.childNodes.forEach((child: Node) => {
      nodes = nodes.concat(getTextNodes(child));
    });
  } else if (node.nodeType === TEXT_NODE_TYPE) {
    nodes.push(node as Text);
  }

  return nodes;
}


/**
 * The keyboard mixin normalizes keyboard input across browsers.
 * This is due to varying levels of support by browser vendors
 * of different Web APIs. The Input Events API provides a fairly
 * robust set of events that we can use to correctly detect input
 * from people fluent in CJK languages (Chinese, Japanese, and Korean).
 * These languages share a feature that _most_ input methods are
 * done through a series of characters.
 *
 * For example, in Japanese, the following sequence of roman
 * characters will result in the following set of text:
 *
 * | w | wa | wat | wata | watas | watash | watashi |
 * | w | わ | わt | わた | わたs | わたsh | 私      |
 *
 * This results in text that does not map 1:1 to the keys that
 * the person typed on their keyboard.
 *
 * This is the same series of events that we receive from
 * autocorrect and predictive text keyboards.
 *
 * Our approach here is to do the best we can to get the most
 * accurate set of events from the user's keyboard. We can only
 * promise accuracy to the level of what is provided by the
 * fidelity of the web API that's available for use in the browser.
 */
class TextInput extends events(HTMLElement) {
  static events = {
    'beforeinput': 'beforeinput',
    'compositionend'(evt) {
      let { start } = this.selection;
      this.dispatchEvent(new CustomEvent('insertText', { detail: { position: start, text: evt.data } }));
      this.composing = false;
    },
    'change text-selection'(evt) {
      this.selection = evt.detail;
    }
    'clear text-selection'() {
      this.selection = null;
    }
  };
  private selection?: { start: number, end: number, collapsed: boolean } | null;

  beforeinput(evt: InputEvent) {

    if (evt.isComposing) return;

    let ranges = evt.getTargetRanges();
    let { start, end } = this.selection;

    console.log('here is a thing', evt);

    switch (evt.inputType) {
    case 'insertText':
      this.dispatchEvent(new CustomEvent('insertText', { detail: { position: start, text: evt.data } }));
      break;

    case 'insertParagraph':
      this.dispatchEvent(new CustomEvent('insertText', { detail: { position: start, text: "\n" } }));
      break;

    case 'insertLineBreak':
      this.dispatchEvent(new CustomEvent('insertText', [start, '\u2028', true]));
      this.dispatchEvent(new CustomEvent('addAnnotation', {
        detail: { type: 'line-break', start, end: end + 1 }
      }));
      break;

    case 'deleteContentBackward':
      if (this.selection.collapsed) {
        start--;
      }
      this.dispatchEvent(new CustomEvent('deleteText', {
        detail: { start, end }
      }));
      break;

    case 'deleteWordBackward':
      if (this.selection.collapsed) {
        end++;
      }

      var target = evt.getTargetRanges()[0];
      let deletionStart = this.nodeAndOffsetToDocumentOffset(target.startContainer, target.startOffset);
      let deletionEnd = this.nodeAndOffsetToDocumentOffset(target.endContainer, target.endOffset);

      this.dispatchEvent(new CustomEvent('deleteText', {
        detail: { start: deletionStart, end: deletionEnd }
      }));
      break;

    case 'deleteContentForward':
      if (this.selection.collapsed) {
        end++;
      }

      var target = evt.getTargetRanges()[0];
      let deletionStart = this.nodeAndOffsetToDocumentOffset(target.startContainer, target.startOffset);
      let deletionEnd = this.nodeAndOffsetToDocumentOffset(target.endContainer, target.endOffset);

      this.dispatchEvent(new CustomEvent('deleteText', {
        detail: { start: deletionStart, end: deletionEnd }
      }));
      break;

    case 'deleteContentForward':
      if (this.selection.collapsed) {
        end++;
      }
      this.dispatchEvent(new CustomEvent('deleteText', {
        detail: { start, end }
      }));
      break;

    case 'insertReplacementText':
      console.log('in here with evt', evt);
      // n.b. this assumes that there is only one target range.
      if (evt.getTargetRanges().length !== 1) {
        throw new Error('Unhandled scenario. Breaking in an unelegant way. Expected exactly one target range in insertReplacementText handler, got', evt.getTargetRanges().length);
      }

      var target = evt.getTargetRanges()[0];
      let replaceStart = this.nodeAndOffsetToDocumentOffset(target.startContainer, target.startOffset);
      let replaceEnd = this.nodeAndOffsetToDocumentOffset(target.endContainer, target.endOffset);

      console.log('found', {start: replaceStart, end: replaceEnd}, 'for target', target);

      evt.dataTransfer.items[0].getAsString(replString => {
        this.dispatchEvent(new CustomEvent('replaceText', {
          detail: { start: replaceStart, end: replaceEnd, text: replString }
        }));
      });

      break;

    case 'formatBold':
      this.dispatchEvent(new CustomEvent('addAnnotation', {
        detail: { start, end, type: 'bold' }
      }));
      break;

    case 'formatItalic':
      this.dispatchEvent(new CustomEvent('addAnnotation', {
        detail: { start, end, type: 'italic' }
      }));
      break;
    }
  }

  // This could be better implemented by tagging each parent node (i.e.,
  // not-text node) with its start offset, so that we could go from text node +
  // offset to document offset directly. Not going to do it now to minimize
  // impact across the codebase, but flagging here as a potential and desirable
  // separate refactor.
  nodeAndOffsetToDocumentOffset(node, offset): number {
    let textNodes = getTextNodes(this);

    let l = textNodes.length;
    let currOffset = 0;

    for (let i = 0; i < l; i++) {
      let currNode = textNodes[i];

      if (currNode === node) {
        return currOffset + offset;
      } else {
        currOffset += (currNode.nodeValue || '').length
      }
    }

    throw new Error('Did not find a matching node. Was matching against', node, textNodes);
  }
};

customElements.define('text-input', TextInput);

export default TextInput;
