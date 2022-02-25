import { ReadLines } from '../engine/import/importerutils.js';
import { AddDiv, CreateDomElement } from '../engine/viewer/domutils.js';
import { ButtonDialog } from './modal.js';
import {localize} from "../i18n/locale";

export function ShowOpenUrlDialog (onOk)
{
    let dialog = new ButtonDialog ();
    let urlsTextArea = CreateDomElement ('textarea', 'ov_dialog_textarea');
    let contentDiv = dialog.Init (localize('openModelFromUrl', 'Open Model from Url'), [
        {
            name : localize('cancel', 'Cancel'),
            subClass : 'outline',
            onClick () {
                dialog.Hide ();
            }
        },
        {
            name : 'OK',
            onClick () {
                let urls = [];
                ReadLines (urlsTextArea.value, (line) => {
                    urls.push (line);
                });
                dialog.Hide ();
                onOk (urls);
            }
        }
    ]);
    let textdft = 'Here you can load models based on their urls. You can add more lines if your model builds up from multiple files.';
    let text = localize('hereLoadModelsUrls', textdft);
    AddDiv (contentDiv, 'ov_dialog_section', text);
    contentDiv.appendChild (urlsTextArea);
    dialog.Show ();
    urlsTextArea.focus ();
    return dialog;
}
