import Document from '@atjson/document';
import Editor from '../src';

import EditableLink from '../src/components/editable-link';

if (!window.customElements.get('text-editor')) {
  window.customElements.define('text-editor', Editor);
}

// Web components in the registry can't be redefined,
// so reload the page on every change
if (module.hot) {
  module.hot.dispose(function () {
    window.location.reload();
  });
}

document.addEventListener('DOMContentLoaded', function () {

  let editor = document.querySelector('text-editor');
  editor.addContentFeature(EditableLink);

  let doc = new URL(location.toString()).searchParams.get('document');
  if (doc) {
    editor.setDocument(new Document(JSON.parse(doc)));
  } else {
    let doc = new Document({
      content: 'Some text that is both bold and italic plus something after.',
      annotations: [
        { type: 'bold', display: 'inline', start: 23, end: 31 },
        { type: 'link', display: 'inline', start: 20, end: 24, attributes: { url: 'https://google.com' } },
        { type: 'italic', display: 'inline', start: 28, end: 38 },
        { type: 'underline', display: 'inline', start: 28, end: 38 },
        { type: 'paragraph', display: 'block', start: 0, end: 61 }
      ]
    });

    editor.setDocument(doc);
  }
});
