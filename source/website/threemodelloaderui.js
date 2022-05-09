import {AddDiv} from '../engine/viewer/domutils.js';
import {ThreeModelLoader} from '../engine/threejs/threemodelloader.js';
import {ShowMessageDialog} from './dialogs.js';
import {ButtonDialog, ProgressDialog} from './dialog.js';
import {AddSvgIconElement} from './utils.js';
import {ImportErrorCode} from '../engine/import/importer.js';
import {localize} from '../i18n/locale';

export class ThreeModelLoaderUI {
    constructor() {
        this.modelLoader = new ThreeModelLoader();
        this.modalDialog = null;
    }

    LoadModel(files, fileSource, settings, callbacks) {
        if (this.modelLoader.InProgress()) {
            return;
        }

        let progressDialog = null;
        this.modelLoader.LoadModel(files, fileSource, settings, {
            onLoadStart: () => {
                this.CloseDialogIfOpen();
                callbacks.onStart();
                progressDialog = new ProgressDialog();
                progressDialog.Init(localize('loadingModel', 'Loading Model'));
                progressDialog.Open();
            },
            onSelectMainFile: (fileNames, selectFile) => {
                progressDialog.Close();
                this.modalDialog = this.ShowFileSelectorDialog(fileNames, (index) => {
                    progressDialog.Open();
                    selectFile(index);
                });
            },
            onImportStart: () => {
                progressDialog.SetText(localize('importingModel', 'Importing Model'));
            },
            onVisualizationStart: () => {
                progressDialog.SetText(localize('visualizingModel', 'Visualizing Model'));
            },
            onModelFinished: (importResult, threeObject) => {
                progressDialog.Close();
                callbacks.onFinish(importResult, threeObject);
            },
            onTextureLoaded: () => {
                callbacks.onRender();
            },
            onLoadError: (importError) => {
                progressDialog.Close();
                callbacks.onError(importError);
                this.modalDialog = this.ShowErrorDialog(importError);
            },
        });
    }

    GetModelLoader() {
        return this.modelLoader;
    }

    GetImporter() {
        return this.modelLoader.GetImporter();
    }

    ShowErrorDialog(importError) {
        if (importError.code === ImportErrorCode.NoImportableFile) {
            return ShowMessageDialog(
                localize('somethingWentWrong', 'Something went wrong'),
                localize('noImportableFileFound', 'No importable file found.'),
                null
            );
        } else if (importError.code === ImportErrorCode.FailedToLoadFile) {
            return ShowMessageDialog(
                localize('somethingWentWrong', 'Something went wrong'),
                localize('failedToLoadFileForImport', 'Failed to load file for import.'),
                null
            );
        } else if (importError.code === ImportErrorCode.ImportFailed) {
            return ShowMessageDialog(
                localize('somethingWentWrong', 'Something went wrong'),
                localize('failedToImportModel', 'Failed to import model.'),
                importError.message
            );
        } else {
            return ShowMessageDialog(
                localize('somethingWentWrong', 'Something went wrong'),
                localize('unknownError', 'Unknown error.'),
                null
            );
        }
    }

    ShowFileSelectorDialog(fileNames, onSelect) {
        let dialog = new ButtonDialog();
        let contentDiv = dialog.Init(localize('selectModel', 'Select Model'), [
            {
                name: localize('cancel', 'Cancel'),
                subClass: 'outline',
                onClick() {
                    dialog.Close();
                }
            }
        ]);
        dialog.SetCloseHandler(() => {
            onSelect(null);
        });

        let textDft = 'Multiple importable models found. Select the model you would like to import from the list below.';
        let text = localize('multipleImportableModelsFoundSelectOne', textDft);
        AddDiv(contentDiv, 'ov_dialog_message', text);

        let fileListSection = AddDiv(contentDiv, 'ov_dialog_section');
        let fileList = AddDiv(fileListSection, 'ov_dialog_import_file_list ov_thin_scrollbar');

        for (let i = 0; i < fileNames.length; i++) {
            let fileName = fileNames[i];
            let fileLink = AddDiv(fileList, 'ov_dialog_file_link');
            AddSvgIconElement(fileLink, 'meshes', 'ov_file_link_img');
            AddDiv(fileLink, 'ov_dialog_file_link_text', fileName);
            fileLink.addEventListener('click', () => {
                dialog.SetCloseHandler(null);
                dialog.Close();
                onSelect(i);
            });
        }

        dialog.Open();
        return dialog;
    }

    CloseDialogIfOpen() {
        if (this.modalDialog !== null) {
            this.modalDialog.Close();
            this.modalDialog = null;
        }
    }
}
