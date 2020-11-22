import { Assertions, Chain, Log, Pipeline, UiFinder } from '@ephox/agar';
import { Assert, UnitTest } from '@ephox/bedrock-client';
import { ApiChains, Editor as McEditor } from '@ephox/mcagar';
import { Selectors, SugarElement } from '@ephox/sugar';
import Editor from 'tinymce/core/api/Editor';
import { EditorEvent } from 'tinymce/core/api/util/EventDispatcher';
import Plugin from 'tinymce/plugins/table/Plugin';
import SilverTheme from 'tinymce/themes/silver/Theme';

UnitTest.asynctest('browser.tinymce.plugins.table.TableSectionApiTest', (success, failure) => {
  Plugin();
  SilverTheme();

  const bodyContent = `<table>
<tbody>
<tr id="one">
<td>text</td>
</tr>
<tr id="two">
<td>text</td>
</tr>
</tbody>
</table>`;

  const theadContent = `<table>
<thead>
<tr id="one">
<td scope="col">text</td>
</tr>
</thead>
<tbody>
<tr id="two">
<td>text</td>
</tr>
</tbody>
</table>`;

  const thsContent = `<table>
<tbody>
<tr id="one">
<th scope="col">text</th>
</tr>
<tr id="two">
<td>text</td>
</tr>
</tbody>
</table>`;

  const thsContentReversed = `<table>
<tbody>
<tr id="two">
<td>text</td>
</tr>
<tr id="one">
<th scope="col">text</th>
</tr>
</tbody>
</table>`;

  const theadThsContent = `<table>
<thead>
<tr id="one">
<th scope="col">text</th>
</tr>
</thead>
<tbody>
<tr id="two">
<td>text</td>
</tr>
</tbody>
</table>`;

  const tfootContent = `<table>
<tbody>
<tr id="two">
<td>text</td>
</tr>
</tbody>
<tfoot>
<tr id="one">
<td>text</td>
</tr>
</tfoot>
</table>`;

  const bodyContentReversed = `<table>
<tbody>
<tr id="two">
<td>text</td>
</tr>
<tr id="one">
<td>text</td>
</tr>
</tbody>
</table>`;

  const bodyColumnContent = `<table>
<tbody>
<tr id="one">
<td>text</td>
<td>text</td>
</tr>
<tr id="two">
<td>text</td>
<td>text</td>
</tr>
</tbody>
</table>`;

  const bodyMultipleChangesColumnContent = `<table>
<tbody>
<tr>
<td>text</td>
<td>text</td>
</tr>
<tr>
<td>text</td>
<td>text</td>
</tr>
</tbody>
</table>`;

  const headerColumnContent = `<table>
<tbody>
<tr id="one">
<th scope="row">text</th>
<td>text</td>
</tr>
<tr id="two">
<th scope="row">text</th>
<td>text</td>
</tr>
</tbody>
</table>`;

  const headerMultipleChangesColumnContent = `<table>
<tbody>
<tr>
<th scope="row">text</th>
<th scope="row">text</th>
</tr>
<tr>
<th scope="row">text</th>
<th scope="row">text</th>
</tr>
</tbody>
</table>`;

  const headerCellContent = `<table>
<tbody>
<tr id="one">
<th>text</th>
</tr>
<tr id="two">
<td>text</td>
</tr>
</tbody>
</table>`;

  let events = [];
  const logEvent = (event: EditorEvent<{}>) => {
    events.push(event);
  };

  const cSelectAllCells = (type: 'td' | 'th') =>
    Chain.op((editor: Editor) => {
      const searchingForType = type === 'th' ? 'td' : 'th';

      const cells = Selectors.all(searchingForType, SugarElement.fromDom(editor.getBody()));

      selectRangeXY(editor, cells[0].dom, cells[cells.length - 1].dom);
    });

  const selectRangeXY = (editor: Editor, startTd: EventTarget, endTd: EventTarget) => {
    editor.fire('mousedown', { target: startTd, button: 0 } as MouseEvent);
    editor.fire('mouseover', { target: endTd, button: 0 } as MouseEvent);
    editor.fire('mouseup', { target: endTd, button: 0 } as MouseEvent);
  };

  const cSwitchType = (startContent: string, expectedContent: string, command: string, type: string, selector = 'tr#one td') =>
    Log.chain('TINY-6150', `Switch to ${type}, command = ${command}`, Chain.fromParent(Chain.identity, [
      ApiChains.cSetContent(startContent),
      Chain.op((editor: Editor) => {
        const row = UiFinder.findIn(SugarElement.fromDom(editor.getBody()), selector).getOrDie();
        editor.selection.select(row.dom);
        events = [];
        editor.execCommand(command, false, { type });
        Assertions.assertEq('TINY-6629: Assert table modified events length', 1, events.length);
        Assertions.assertEq('TINY-6629: Assert table modified event', 'tablemodified', events[0].type);
        Assertions.assertEq('TINY-6643: Should have structure modified', true, events[0].structure);
        Assertions.assertEq('TINY-6643: Should not have style modified', false, events[0].style);
        events = [];
      }),
      ApiChains.cAssertContent(expectedContent)
    ]));

  const cSwitchMultipleColumnsType = (startContent: string, expectedContent: string, command: string, type: 'td' | 'th') =>
    Log.chain('TINY-6326', `Switch to ${type}, command = ${command}`, Chain.fromParent(Chain.identity, [
      ApiChains.cSetContent(startContent),
      cSelectAllCells(type),
      ApiChains.cExecCommand(command, { type }),
      ApiChains.cAssertContent(expectedContent)
    ]));

  const sSwitchTypeAndConfig = (tableHeaderType: string, startContent: string, expectedContent: string, command: string, type: string, selector = 'tr#one td') =>
    Log.chainsAsStep('TINY-6150', `Switch to ${type}, command = ${command}, table_header_type = ${tableHeaderType}`, [
      McEditor.cFromSettings({
        plugins: 'table',
        theme: 'silver',
        base_url: '/project/tinymce/js/tinymce',
        table_header_type: tableHeaderType,
        setup: (ed: Editor) => ed.on('tablemodified', logEvent)
      }),
      cSwitchType(startContent, expectedContent, command, type, selector),
      McEditor.cRemove
    ]);

  const cGetType = (content: string, command: string, expected: string, selector = 'tr#one td') =>
    Log.chain('TINY-6150', `Get type of ${selector} using ${command}`, Chain.fromParent(Chain.identity, [
      ApiChains.cSetContent(content),
      Chain.op((editor: Editor) => {
        const row = UiFinder.findIn(SugarElement.fromDom(editor.getBody()), selector).getOrDie();
        editor.selection.select(row.dom);
        const value = editor.queryCommandValue(command);
        Assert.eq(`Assert query value is ${expected}`, expected, value);
      })
    ]));

  // Note: cases double up with SwitchTableSectionTest a lot, so not as in depth as that test for rows
  Pipeline.async({}, [
    // Tests to switch between row section types that require changing the editor content
    sSwitchTypeAndConfig('section', bodyContent, theadContent, 'mceTableRowType', 'header'),
    sSwitchTypeAndConfig('cells', bodyContent, thsContent, 'mceTableRowType', 'header'),
    sSwitchTypeAndConfig('sectionCells', bodyContent, theadThsContent, 'mceTableRowType', 'header'),
    sSwitchTypeAndConfig('section', tfootContent, theadContent, 'mceTableRowType', 'header'),
    sSwitchTypeAndConfig('cells', tfootContent, thsContentReversed, 'mceTableRowType', 'header'),
    sSwitchTypeAndConfig('sectionCells', tfootContent, theadThsContent, 'mceTableRowType', 'header'),
    sSwitchTypeAndConfig('foo', bodyContent, theadContent, 'mceTableRowType', 'header'), // setting value is invalid so default to section
    Chain.asStep({}, [
      McEditor.cFromSettings({
        plugins: 'table',
        theme: 'silver',
        base_url: '/project/tinymce/js/tinymce',
        setup: (ed: Editor) => ed.on('tablemodified', logEvent)
      }),
      Chain.fromParent(Chain.identity, [
        // Basic tests to switch between row section types
        cSwitchType(theadContent, bodyContent, 'mceTableRowType', 'body'),
        cSwitchType(tfootContent, bodyContentReversed, 'mceTableRowType', 'body'),
        cSwitchType(bodyContent, tfootContent, 'mceTableRowType', 'footer'),
        cSwitchType(tfootContent, theadContent, 'mceTableRowType', 'header'),
        // Basic tests to switch between column section types
        cSwitchType(bodyColumnContent, headerColumnContent, 'mceTableColType', 'th'),
        cSwitchMultipleColumnsType(bodyMultipleChangesColumnContent, headerMultipleChangesColumnContent, 'mceTableColType', 'th'),
        cSwitchType(headerColumnContent, bodyColumnContent, 'mceTableColType', 'td', 'tr#one th'),
        cSwitchMultipleColumnsType(headerMultipleChangesColumnContent, bodyMultipleChangesColumnContent, 'mceTableColType', 'td'),
        // Basic tests to switch between cell section types
        cSwitchType(bodyContent, headerCellContent, 'mceTableCellType', 'th'),
        cSwitchType(headerCellContent, bodyContent, 'mceTableCellType', 'td', 'tr#one th'),
        // Tests to get the type from the API
        cGetType(bodyContent, 'mceTableRowType', 'body'),
        cGetType(theadContent, 'mceTableRowType', 'header'),
        cGetType(thsContent, 'mceTableRowType', 'header', 'tr#one th'),
        cGetType(theadThsContent, 'mceTableRowType', 'header', 'tr#one th'),
        cGetType(tfootContent, 'mceTableRowType', 'footer'),
        cGetType(bodyColumnContent, 'mceTableColType', 'td'),
        cGetType(headerColumnContent, 'mceTableColType', 'th', 'tr#one th'),
        cGetType(headerCellContent, 'mceTableColType', '', 'tr#one th'),
        cGetType(bodyContent, 'mceTableCellType', 'td'),
        cGetType(headerCellContent, 'mceTableCellType', 'th', 'tr#one th')
      ]),
      McEditor.cRemove
    ])
  ], success, failure);
});
