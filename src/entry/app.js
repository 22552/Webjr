import {preprocessAndLoadCss} from '../utils/lib';
import Localization from '../utils/Localization';
import InitialOptions from '../utils/InitialOptions';
import MobileUI from '../utils/MobileUI';
import ExtensionRegistry from '../utils/ExtensionRegistry';
import VariableRegistry from '../utils/VariableRegistry';
import NativeExtras from '../utils/NativeExtras';
import OS from '../tablet/OS';
import IO from '../tablet/IO';
import MediaLib from '../tablet/MediaLib';

import {indexMain} from './index';
import {homeMain} from './home';
import {editorMain} from './editor';
import {gettingStartedMain} from './gettingstarted';
import {inappInterfaceGuide, inappAbout, inappBlocksGuide, inappPaintEditorGuide} from './inapp';

function loadSettings (settingsRoot, whenDone) {
    IO.requestFromServer(settingsRoot + 'settings.json', (result) => {
        window.Settings = JSON.parse(result);
        whenDone();
    });
}

window.onload = () => {
    let entryFunction = () => {};
    let root = './';
    const page = window.scratchJrPage;

    switch (page) {
    case 'index':
        preprocessAndLoadCss('css', 'css/font.css');
        preprocessAndLoadCss('css', 'css/base.css');
        preprocessAndLoadCss('css', 'css/start.css');
        preprocessAndLoadCss('css', 'css/thumbs.css');
        preprocessAndLoadCss('css', 'css/editor.css');
        entryFunction = () => OS.waitForInterface(indexMain);
        break;
    case 'home':
        preprocessAndLoadCss('css', 'css/font.css');
        preprocessAndLoadCss('css', 'css/base.css');
        preprocessAndLoadCss('css', 'css/lobby.css');
        preprocessAndLoadCss('css', 'css/thumbs.css');
        entryFunction = () => OS.waitForInterface(homeMain);
        break;
    case 'editor':
        preprocessAndLoadCss('css', 'css/font.css');
        preprocessAndLoadCss('css', 'css/base.css');
        preprocessAndLoadCss('css', 'css/editor.css');
        preprocessAndLoadCss('css', 'css/editorleftpanel.css');
        preprocessAndLoadCss('css', 'css/editorstage.css');
        preprocessAndLoadCss('css', 'css/editormodal.css');
        preprocessAndLoadCss('css', 'css/librarymodal.css');
        preprocessAndLoadCss('css', 'css/paintlook.css');
        entryFunction = () => OS.waitForInterface(() => {
            editorMain();
            MobileUI.init();
            NativeExtras.mountEditor();
        });
        break;
    case 'gettingStarted':
        preprocessAndLoadCss('css', 'css/font.css');
        preprocessAndLoadCss('css', 'css/base.css');
        preprocessAndLoadCss('css', 'css/gs.css');
        entryFunction = () => OS.waitForInterface(gettingStartedMain);
        break;
    case 'inappAbout':
        preprocessAndLoadCss('style', 'style/about.css');
        entryFunction = () => inappAbout();
        root = '../';
        break;
    case 'inappInterfaceGuide':
        preprocessAndLoadCss('style', 'style/style.css');
        preprocessAndLoadCss('style', 'style/interface.css');
        entryFunction = () => inappInterfaceGuide();
        root = '../';
        break;
    case 'inappPaintEditorGuide':
        preprocessAndLoadCss('style', 'style/style.css');
        preprocessAndLoadCss('style', 'style/paint.css');
        entryFunction = () => inappPaintEditorGuide();
        root = '../';
        break;
    case 'inappBlocksGuide':
        preprocessAndLoadCss('style', 'style/style.css');
        preprocessAndLoadCss('style', 'style/blocks.css');
        entryFunction = () => inappBlocksGuide();
        root = '../';
        break;
    }

    MobileUI.initViewport();

    loadSettings(root, () => {
        if (page === 'editor') {
            ExtensionRegistry.bootstrap();
            VariableRegistry.bootstrap();
            NativeExtras.bootstrap();
        }
        Localization.includeLocales(root, () => {
            MediaLib.loadMediaLib(root, () => {
                entryFunction();
            });
        });
        InitialOptions.initWithSettings(window.Settings.initialOptions);
    });
};
