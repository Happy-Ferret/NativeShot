// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.importGlobalProperties(['Blob', 'URL']);

const COMMONJS_URI = 'resource://gre/modules/commonjs';
const { require } = Cu.import(COMMONJS_URI + '/toolkit/require.js', {});
var CLIPBOARD = require('sdk/clipboard');

var BEAUTIFY = {};
(function() {
	var { require } = Cu.import('resource://devtools/shared/Loader.jsm', {});
	var { jsBeautify } = require('devtools/shared/jsbeautify/src/beautify-js');
	BEAUTIFY.js = jsBeautify;
}());

// Lazy Imports
const myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'as', () => Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService) );

var nsIFile = CC('@mozilla.org/file/local;1', Ci.nsILocalFile, 'initWithPath');

// Globals
var core = {
	addon: {
		name: 'NativeShot',
		id: 'NativeShot@jetpack',
		path: {
			name: 'nativeshot',
			//
			content: 'chrome://nativeshot/content/',
			locale: 'chrome://nativeshot/locale/',
			//
			resources: 'chrome://nativeshot/content/resources/',
			images: 'chrome://nativeshot/content/resources/images/',
			scripts: 'chrome://nativeshot/content/resources/scripts/',
			styles: 'chrome://nativeshot/content/resources/styles/',
			fonts: 'chrome://nativeshot/content/resources/styles/fonts/',
			pages: 'chrome://nativeshot/content/resources/pages/'
			// below are added by worker
			// storage: OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage')
		},
		cache_key: Math.random() // set to version on release
	},
	os: {
		// // name: added by worker
		// // mname: added by worker
		toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version,
		channel: Services.prefs.getCharPref('app.update.channel')
	},
	nativeshot: {
		services: {
			imguranon: {
				code: 0,
				type: 'upload',
				datatype: 'png_arrbuf'
			},
			twitter: {
				code: 1,
				type: 'share',
				datatype: 'png_arrbuf'
			},
			copy: {
				code: 2,
				type: 'system',
				datatype: 'png_arrbuf',
				noimg: true // no associated image file to show on history page
			},
			print: {
				code: 3,
				type: 'system',
				datatype: 'png_arrbuf',
				noimg: true
			},
			savequick: {
				code: 4,
				type: 'system',
				datatype: 'png_arrbuf'
			},
			savebrowse: {
				code: 5,
				type: 'system',
				datatype: 'png_arrbuf'
			},
			tineye: {
				code: 7,
				type: 'search',
				datatype: 'png_arrbuf',
				noimg: true
			},
			googleimages: {
				code: 8,
				type: 'search',
				datatype: 'png_arrbuf',
				noimg: true
			},
			dropbox: {
				code: 9,
				type: 'upload',
				datatype: 'png_arrbuf'
			},
			imgur: {
				code: 10,
				type: 'upload',
				datatype: 'png_arrbuf'
			},
			gdrive: {
				code: 11,
				type: 'upload',
				datatype: 'png_arrbuf'
			},
			gocr: {
				code: 12,
				type: 'ocr',
				datatype: 'plain_arrbuf',
				noimg: true
			},
			ocrad: {
				code: 13,
				type: 'ocr',
				datatype: 'plain_arrbuf',
				noimg: true
			},
			tesseract: {
				code: 14,
				type: 'ocr',
				datatype: 'plain_arrbuf',
				noimg: true
			},
			ocrall: {
				code: 15,
				type: 'ocr',
				datatype: 'plain_arrbuf',
				noimg: true,
				history_ignore: true
			},
			bing: {
				code: 16,
				type: 'search',
				datatype: 'png_arrbuf',
				noimg: true
			},
			facebook: {
				code: 17,
				type: 'share',
				datatype: 'png_arrbuf'
			}
		}
	}
};

var gBootstrap;

var gWkComm;
var gFsComm;
var callInMainworker, callInContentinframescript, callInFramescript;

var gAndroidMenuIds = [];

var gCuiCssUri;
var gGenCssUri;

var OSStuff = {};

var gSession = {
	// id: null - set when a session is in progress,
	// shots: collMonInfos,
	// domwin_wk - most recent browser window when session started
	// domwin_was_focused - was it focused when session started
};
var gAttn = {}; // key is session id

var ostypes;
var gFonts;
var gEditorStateStr;

const NS_HTML = 'http://www.w3.org/1999/xhtml';
const NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';


function install() {}
function uninstall(aData, aReason) {
    if (aReason == ADDON_UNINSTALL) {
		Cu.import('resource://gre/modules/osfile.jsm');
		OS.File.removeDir(OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id), {ignorePermissions:true, ignoreAbsent:true}); // will reject if `jetpack` folder does not exist
	}
}

function startup(aData, aReason) {

    Services.scriptloader.loadSubScript(core.addon.path.scripts + 'comm/Comm.js', gBootstrap);
    ({ callInMainworker, callInContentinframescript, callInFramescript } = CommHelper.bootstrap);

    gWkComm = new Comm.server.worker(core.addon.path.scripts + 'MainWorker.js?' + core.addon.cache_key, ()=>core, function(aArg, aComm) {
        ({ core } = aArg);

		gFsComm = new Comm.server.framescript(core.addon.id);

        Services.mm.loadFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key, true);

        // desktop:insert_gui
        if (core.os.name != 'android') {

			gGenCssUri = Services.io.newURI(core.addon.path.styles + 'general.css', null, null);
			gCuiCssUri = Services.io.newURI(core.addon.path.styles + getCuiCssFilename(), null, null);

    		// insert cui
    		Cu.import('resource:///modules/CustomizableUI.jsm');
    		CustomizableUI.createWidget({
    			id: 'cui_' + core.addon.path.name,
    			defaultArea: CustomizableUI.AREA_NAVBAR,
    			label: formatStringFromNameCore('gui_label', 'main'),
    			tooltiptext: formatStringFromNameCore('gui_tooltip', 'main'),
    			onCommand: guiClick
    		});

    	}

        // register must go after the above, as i set gCuiCssUri above
        windowListener.register();

		if (core.os.name != 'android') {
			Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react-mozNotificationBar/host.js', gBootstrap);
			AB.init();
		}

    });

    callInMainworker('dummyForInstantInstantiate');
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) {
		callInMainworker('writeFilestore');
		return;
	}

	Services.mm.removeDelayedFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key);

    Comm.server.unregAll('framescript');
    Comm.server.unregAll('worker');

    // desktop_android:insert_gui
    if (core.os.name != 'android') {
		CustomizableUI.destroyWidget('cui_' + core.addon.path.name);
	} else {
		for (var androidMenu of gAndroidMenus) {
			var domwin = getStrongReference(androidMenu.domwin);
			if (!domwin) {
				// its dead
				continue;
			}
			domwin.NativeWindow.menu.remove(androidMenu.menuid);
		}
	}

	windowListener.unregister();

	AB.uninit();

	releaseAllResourceURI();
}

// start - addon functions
function getCuiCssFilename() {
	var cuiCssFilename;
	if (Services.prefs.getCharPref('app.update.channel') == 'aurora') {
		if (core.os.mname != 'darwin') {
			// i didnt test dev edition on winxp, not sure what it is there
			cuiCssFilename = 'cui_dev.css';
		} else {
			cuiCssFilename = 'cui_dev_mac.css';
		}
	} else {
		if (core.os.mname == 'darwin') {
			cuiCssFilename = 'cui_mac.css';
		} else if (core.os.mname == 'gtk') {
			cuiCssFilename = 'cui_gtk.css';
		} else {
			// windows
			if (core.os.version <= 5.2) {
				// xp
				cuiCssFilename = 'cui_gtk.css';
			} else {
				cuiCssFilename = 'cui.css';
			}
		}
	}
	return cuiCssFilename;
}
function guiClick(e) {
	if (!gSession.id) {
		if (e.shiftKey) {
			// add delay
			callInMainworker('countdownStartOrIncrement', 5, function(aArg) {
				var { sec_left, done } = aArg;
				if (done) {
					// countdown done
					guiSetBadge(null);
					guiClick({});
				} else {
					// done is false or undefined
					// if false it means it was incremented and its closing the pathway. but it sends a sec_left with it, which is the newly incremented countdown
						//	OR it means it was cancelled. when cancelled there is no sec_left
					// if undefined then sec_left is there, and they are providing progress updates
					if (sec_left !== undefined) {
						// progress, or increment close
						guiSetBadge(sec_left);
					}
					else { console.log('cancelled - pathway cleaned up') }
				}
			});
		} else {
			// clear delay if there was one
			callInMainworker('countdownCancel', undefined, function(aArg) {
				var cancelled = aArg;
				if (cancelled) {
					guiSetBadge(null);
				}
			});
			takeShot();
		}
	}
	else { console.warn('editor is currently open, so do nothing') }
}
function guiSetBadge(aTxt) {
	// set aTxt to null if you want to remove badge
	var widgetInstances = CustomizableUI.getWidget('cui_' + core.addon.path.name).instances;
	for (var i=0; i<widgetInstances.length; i++) {
		var inst = widgetInstances[i];
		var node = inst.node;
		if (aTxt === null) {
			node.classList.remove('badged-button');
			node.removeAttribute('badge');
		} else {
			node.setAttribute('badge', aTxt);
			node.classList.add('badged-button'); // classList.add does not add duplicate classes
		}
	}
}

function takeShot() {
	gSession.id = Date.now();
	// start - async-proc939333
	var shots;
	var allMonDimStr;
	var shootAllMons = function() {
		callInMainworker('shootAllMons', undefined, function(aArg) {
			({ collMonInfos } = aArg);

			for (var i=0; i<collMonInfos.length; i++) {
				collMonInfos[i].arrbuf = aArg['arrbuf' + i];

				collMonInfos[i].port1 = aArg['screenshot' + i + '_port1'];
				collMonInfos[i].port2 = aArg['screenshot' + i + '_port2'];
			}

			// call it shots
			shots = collMonInfos;
			gSession.shots = shots;

			// the most recent browser window when screenshot was taken
			var domwin = Services.wm.getMostRecentWindow('navigator:browser');
			gSession.domwin_wk = Cu.getWeakReference(domwin);
			gSession.domwin = domwin;
			gSession.domwin_was_focused = isFocused(domwin);

			// create allMonDimStr
			var allMonDim = [];
			for (var shot of shots) {
				allMonDim.push({
					x: shot.x,
					y: shot.y,
					w: shot.w,
					h: shot.h
					// win81ScaleX: shot.win81ScaleX,
					// win81ScaleY: shot.win81ScaleY
				});
			}
			allMonDimStr = JSON.stringify(allMonDim);

			ensureGlobalEditorstate();
		});
	};

	var ensureGlobalEditorstate = function() {
		if (!gEditorStateStr) {
			callInMainworker('fetchFilestoreEntry', {mainkey:'editorstate'}, function(aArg) {
				gEditorStateStr = JSON.stringify(aArg);
				openEditorWins();
			});
		} else {
			openEditorWins();
		}
	};

	var openEditorWins = function() {
		// open window for each shot
		var i = -1;
		for (var shot of shots) {
			i++;

			var x = shot.x;
			var y = shot.y;
			var w = shot.w;
			var h = shot.h;

			// scale it?
			var scaleX = shot.win81ScaleX;
			var scaleY = shot.win81ScaleY;
			if (scaleX) {
				x = Math.floor(x / scaleX);
				w = Math.floor(w / scaleX);
			}
			if (scaleY) {
				y = Math.floor(y / scaleY);
				h = Math.floor(h / scaleY);
			}

			// make query string of the number, string, and boolean properties of shot
			var query_json = Object.assign(
				{
					iMon: i,
					allMonDimStr: allMonDimStr,
					sessionid: gSession.id
				},
				shot
			);
			// console.log('query_json:', query_json);
			var query_str = jQLike.serialize(query_json);
			// console.log('query_str:', query_str);

			var editor_domwin = Services.ww.openWindow(null, 'about:nativeshot?' + query_str, '_blank', 'chrome,titlebar=0,width=' + w + ',height=' + h + ',screenX=' + x + ',screenY=' + y, null);
			shot.domwin_wk = Cu.getWeakReference(editor_domwin);
			shot.domwin = editor_domwin;
		}

		console.log('collMonInfos:', collMonInfos);
	};

	shootAllMons();
	// end - async-proc939333
}

// start - functions called by editor
function editorInitShot(aIMon) {
	// does the platform dependent stuff to make the window be position on the proper monitor and full screened covering all things underneeath
	// also transfer the screenshot data to the window

	var iMon = aIMon; // iMon is my rename of colMonIndex. so its the i in the collMoninfos object
	var shots = gSession.shots;
	var shot = shots[iMon];
	// var aEditorDOMWindow = colMon[iMon].E.DOMWindow;
	//
	// if (!aEditorDOMWindow || aEditorDOMWindow.closed) {
	// 	throw new Error('wtf how is window not existing, the on load observer notifier of panel.xul just sent notification that it was loaded');
	// }

	var domwin = getStrongReference(shot.domwin_wk);
	if (!domwin) {
		Services.prompt(null, 'domwin of shot is dead', 'dead');
	}
	var domwin = shot.domwin;
	var aHwndPtrStr = getNativeHandlePtrStr(domwin);
	shot.hwndPtrStr = aHwndPtrStr;

	// if (core.os.name != 'darwin') {
		// aEditorDOMWindow.moveTo(colMon[iMon].x, colMon[iMon].y);
		// aEditorDOMWindow.resizeTo(colMon[iMon].w, colMon[iMon].h);
	// }

	domwin.focus();

	// if (core.os.name != 'darwin') {
		// aEditorDOMWindow.fullScreen = true;
	// }

	// set window on top:
	var aArrHwndPtrStr = [aHwndPtrStr];
	var aArrHwndPtrOsParams = {};
	aArrHwndPtrOsParams[aHwndPtrStr] = {
		left: shot.x,
		top: shot.y,
		right: shot.x + shot.w,
		bottom: shot.y + shot.h,
		width: shot.w,
		height: shot.h
	};

	// if (core.os.name != 'darwinAAAA') {
	callInMainworker('setWinAlwaysOnTop', { aArrHwndPtrStr, aOptions:aArrHwndPtrOsParams }, function(aArg) {
		if (core.os.name == 'darwin') {
			initOstypes();
			// link98476884
			OSStuff.NSMainMenuWindowLevel = aVal;

			var NSWindowString = getNativeHandlePtrStr(domwin);
			var NSWindowPtr = ostypes.TYPE.NSWindow(ctypes.UInt64(NSWindowString));

			var rez_setLevel = ostypes.API('objc_msgSend')(NSWindowPtr, ostypes.HELPER.sel('setLevel:'), ostypes.TYPE.NSInteger(OSStuff.NSMainMenuWindowLevel + 1)); // have to do + 1 otherwise it is ove rmneubar but not over the corner items. if just + 0 then its over menubar, if - 1 then its under menu bar but still over dock. but the interesting thing is, the browse dialog is under all of these  // link847455111
			console.log('rez_setLevel:', rez_setLevel.toString());

			var newSize = ostypes.TYPE.NSSize(shot.w, shot.h);
			var rez_setContentSize = ostypes.API('objc_msgSend')(NSWindowPtr, ostypes.HELPER.sel('setContentSize:'), newSize);
			console.log('rez_setContentSize:', rez_setContentSize.toString());

			domwin.moveTo(shot.x, shot.y); // must do moveTo after setContentsSize as that sizes from bottom left and moveTo moves from top left. so the sizing will change the top left.
		}
	});

	if (!gFonts) {
			var fontsEnumerator = Cc['@mozilla.org/gfx/fontenumerator;1'].getService(Ci.nsIFontEnumerator);
			gFonts = fontsEnumerator.EnumerateAllFonts({});
	}

	shot.comm.putMessage('init', {
		screenshotArrBuf: shot.arrbuf,
		core: core,
		fonts: gFonts,
		editorstateStr: gEditorStateStr,
		_XFER: ['screenshotArrBuf']
	});

	// set windowtype attribute
	// colMon[aData.iMon].E.DOMWindow.document.documentElement.setAttribute('windowtype', 'nativeshot:canvas');

	// check to see if all monitors inited, if they have been, the fetch all win
	var allWinInited = true;
	for (var shoty of shots) {
		if (!shoty.hwndPtrStr) {
			allWinInited = false;
			break;
		}
	}
	if (allWinInited) {
		if (core.os.mname == 'winnt') {
			// reRaiseCanvasWins(); // ensures its risen
		}
		sendWinArrToEditors();
	}
}

function sendWinArrToEditors() {
	var shots = gSession.shots;

	callInMainworker(
		'getAllWin',
		{
			getPid: true,
			getBounds: true,
			getTitle: true,
			filterVisible: true
		},
		function(aVal) {
			console.log('Fullfilled - promise_fetchWin - ', aVal);
			// Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper).copyString(JSON.stringify(aVal)); // :debug:

			// build hwndPtrStr arr for nativeshot_canvas windows
			var hwndPtrStrArr = [];
			for (var shot of shots) {
				hwndPtrStrArr.push(shot.hwndPtrStr);
			}

			// remove nativeshot_canvas windows
			for (var i=0; i<aVal.length; i++) {
				if (aVal[i].title == 'nativeshot_canvas' || hwndPtrStrArr.indexOf(aVal[i].hwndPtrStr) > -1) {
					// need to do the hwndPtrStr check as on windows, sometimes the page isnt loaded yet, so the title of the window isnt there yet
					// aVal.splice(i, 1);
					aVal[i].left = -10000;
					aVal[i].right = -10000;
					aVal[i].width = 0;
					aVal[i].NATIVESHOT_CANVAS = true;
					// i--;
				}
			}

			for (var shot of shots) {
				shot.comm.putMessage('receiveWinArr', {
					winArr: aVal
				});
			}
		}
	);
}
function broadcastToOthers(aArg) {
	var { iMon } = aArg;
	var shots = gSession.shots;
	// console.log('gSession:', gSession);
	var l = shots.length;
	for (var i=0; i<l; i++) {
		if (i !== iMon) {
			shots[i].comm.putMessage(aArg.topic, aArg);
		}
	}
}

function broadcastToSpecific(aArg) {
	var { toMon } = aArg;
	var shot = gSession.shots[toMon];
	shot.comm.putMessage(aArg.topic, aArg);
}
function exitEditors(aArg) {
	var { iMon, editorstateStr } = aArg;

	var shots = gSession.shots;
	var l = shots.length;
	for (var i=0; i<l; i++) {
		if (i !== iMon) {
			var domwin = getStrongReference(shots[i].domwin_wk);
			if (!domwin) {
				console.error('no domwin for shot:', i, 'shots:', shots);
				Services.prompt.alert(null, 'huh', 'weak ref is dead??');
			}
			shots[i].comm.putMessage('removeUnload', undefined, function(adomwin) {
				adomwin.close();
			}.bind(null, shots[i].domwin));
		}
	}

	// // as nativeshot_canvas windows are now closing. check if should show notification bar - if it has any btns then show it
	// if (gEditorABData_Bar[gEditor.sessionId].ABRef.aBtns.length) {
	// 	console.log('need to show notif bar now');
	// 	gEditorABData_Bar[gEditor.sessionId].shown = true; // otherwise setBtnState will not update react states
	// 	AB.setState(gEditorABData_Bar[gEditor.sessionId].ABRef);
	// 	ifEditorClosed_andBarHasOnlyOneAction_copyToClip(gEditor.sessionId);
	// } else {
	// 	// no need to show, delete it
	// 	console.log('no need to show, delete it');
	// 	delete gEditorABData_Bar[gEditor.sessionId];
	// }
	//
	// // check if need to show twitter notification bars
	// for (var p in NBs.crossWin) {
	// 	if (p.indexOf(gEditor.sessionId) == 0) { // note: this is why i have to start each crossWin id with gEditor.sessionId
	// 		NBs.insertGlobalToWin(p, 'all');
	// 	}
	// }
	// if (gEditor.wasFirefoxWinFocused || gEditor.forceFocus) {
	// 	gEditor.gBrowserDOMWindow.focus();
	// }
	// if (gEditor.printPrevWins) {
	// 	for (var i=0; i<gEditor.printPrevWins.length; i++) {
	// 		gEditor.printPrevWins[i].focus();
	// 	}
	// }
	// // colMon[0].E.DOMWindow.close();

	var sessionid = gSession.id;
	gSession = {}; // gEditor.cleanUp();

	attnUpdate(sessionid); // show the attnbar if there is anything to show

	gEditorStateStr = JSON.stringify(aArg.editorstate);
	console.log('set gEditorStateStr to:', gEditorStateStr);
	callInMainworker('updateFilestoreEntry', {
		mainkey: 'editorstate',
		value: aArg.editorstate
	});
}

var gUsedSelections = []; // array of arrays. each child is [subcutout1, subcutout2, ...]
function indexOfSelInG(aSel) {
	// aSel is an array of subcutouts
	// will return the index it is found in gUsedSelections
	// -1 if not found

	var l = gUsedSelections.length;

	if (!l) {
		return -1;
	} else {

		for (var i=l-1; i>=0; i--) {
			var tSel = gUsedSelections[i]; // testSelection
			var l2 = tSel.length;
			if (l2 === aSel.length) {
				var tSelMatches = true;
				for (var j=0; j<l2; j++) {
					var tSubcutout = tSel[j];
					var cSubcutout = aSel[j];
					console.log('comparing', 'tSel:', tSel, 'aSel:', aSel);
					if (tSubcutout.x !== cSubcutout.x || tSubcutout.y !== cSubcutout.y || tSubcutout.w !== cSubcutout.w || tSubcutout.h !== cSubcutout.h) {
						// tSel does not match aSel
						tSelMatches = false;
						break;
					}
				}
				if (tSelMatches) {
					return i;
				}
			}
		}

		return -1; // not found
	}
}
function addSelectionToHistory(aData) {
	// aData.cutoutsArr is an array of cutouts
	console.log('incoming addSelectionToHistory:', aData);
	var cSel = aData.cutoutsArr;
	var ix = indexOfSelInG(cSel);
	if (ix == -1) {
		gUsedSelections.push(aData.cutoutsArr)
	} else {
		// it was found in history, so lets move this to the most recent selection made
		// most recent selection is the last most element in gUsedSelections array
		gUsedSelections.push(gUsedSelections.splice(ix, 1)[0]);
	}
	console.log('added sel, now gUsedSelections:', gUsedSelections);
}
function selectPreviousSelection(aData) {
	// aData.curSelection is an array of the currently selected cutouts

	if (!gUsedSelections.length) {
		return;
	}

	var cSel = aData.cutoutsArr; // cutouts of the current selection

	// figure out the selection to make
	var selToMake;
	if (cSel) {
		// check to see if this sel is in the history, and select the one before this one
		var ix = indexOfSelInG(cSel);
		if (ix > 0) {
			selToMake = gUsedSelections[ix - 1];
		} else if (ix == -1) {
			// select the most recent one
			selToMake = gUsedSelections[gUsedSelections.length - 1];
		} // else if 0, then no previous selection obviously
	} else {
		// select the most recent one
		selToMake = gUsedSelections[gUsedSelections.length - 1];
	}

	// send message to make the selection
	if (selToMake) {
		gSession.shots[aData.iMon].comm.putMessage('makeSelection', {
			cutoutsArr: selToMake
		}, '*');
	}
}
// end - last selection stuff
function insertTextFromClipboard(aArg) {
	var { iMon } = aArg;
	if (CLIPBOARD.currentFlavors.indexOf('text') > -1) {
		gSession.shots[iMon].comm.putMessage('insertTextFromClipboard', {
			text: CLIPBOARD.get('text')
		}, '*');
	}
}
// end - functions called by editor

function initOstypes() {
	if (!ostypes) {
		Cu.import('resource://gre/modules/ctypes.jsm');

		Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/cutils.jsm', gBootstrap); // need to load cutils first as ostypes_mac uses it for HollowStructure
		Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/ctypes_math.jsm', gBootstrap);
		switch (core.os.mname) {
			case 'winnt':
			case 'winmo':
			case 'wince':
				Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/ostypes_win.jsm', gBootstrap);
				break;
			case 'gtk':
				Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/ostypes_x11.jsm', gBootstrap);
				break;
			case 'darwin':
				Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/ostypes_mac.jsm', gBootstrap);
				break;
			default:
				throw new Error('Operating system, "' + OS.Constants.Sys.Name + '" is not supported');
		}
	}
}

// start - context menu items
var gToolbarContextMenu_domId = 'toolbar-context-menu';
var gCustomizationPanelItemContextMenu_domId = 'customizationPanelItemContextMenu';

var gDashboardMenuitem_domIdSuffix = '_nativeshot-menuitem';
var gDashboardSeperator_domIdSuffix = '_nativeshot-seperator';

var gDashboardMenuitem_jsonTemplate = ['xul:menuitem', {
	// id: 'toolbar-context-menu_nativeshot-menuitem',
	// label: formatStringFromNameCore('dashboard-menuitem', 'main'), // cant access myServices.sb till startup, so this is set on startup // link988888887
	class: 'menuitem-iconic',
	image: core.addon.path.images + 'icon16.png',
	hidden: 'true',
	oncommand: function(e) {
		var gbrowser = e.target.ownerDocument.defaultView.gBrowser;
		var tabs = gbrowser.tabs;
		var l = gbrowser.tabs.length;
		for (var i=0; i<l; i++) {
			// e10s safe way to check content of tab
			if (tabs[i].linkedBrowser.currentURI.spec.toLowerCase().includes('about:nativeshot')) { // crossfile-link381787872 - i didnt link over there but &nativeshot.app-main.title; is what this is equal to
				gbrowser.selectedTab = tabs[i];
				return;
			}
		}
		gbrowser.loadOneTab('about:nativeshot', {inBackground:false});
	}
}];
var gDashboardMenuseperator_jsonTemplate = ['xul:menuseparator', {
	// id: 'toolbar-context-menu_nativeshot-menuseparator', // id is set when inserting into dom
	hidden: 'true'
}];

function contextMenuHiding(e) {
	// only triggered when it was shown due to right click on cui_nativeshot
	console.log('context menu hiding');

	e.target.removeEventListener('popuphiding', contextMenuHiding, false);

	var cToolbarContextMenu_dashboardMenuitem = e.target.querySelector('#' + gToolbarContextMenu_domId + gDashboardMenuitem_domIdSuffix);
	if (cToolbarContextMenu_dashboardMenuitem) {
		var cToolbarContextMenu_dashboardSeperator = e.target.querySelector('#' + gToolbarContextMenu_domId + gDashboardSeperator_domIdSuffix);
		cToolbarContextMenu_dashboardMenuitem.setAttribute('hidden', 'true');
		cToolbarContextMenu_dashboardSeperator.setAttribute('hidden', 'true');
	}

	var cCustomizationPanelItemContextMenu_dashboardMenuitem = e.target.querySelector('#' + gCustomizationPanelItemContextMenu_domId + gDashboardMenuitem_domIdSuffix);
	if (cCustomizationPanelItemContextMenu_dashboardMenuitem) {
		var cCustomizationPanelItemContextMenu_dashboardSeperator = e.target.querySelector('#' + gCustomizationPanelItemContextMenu_domId + gDashboardSeperator_domIdSuffix);
		cCustomizationPanelItemContextMenu_dashboardMenuitem.setAttribute('hidden', 'true');
		cCustomizationPanelItemContextMenu_dashboardMenuitem.setAttribute('hidden', 'true');
	}

}

function contextMenuShowing(e) {
	console.log('context menu showing', 'popupNode:', e.target.ownerDocument.popupNode);

	var cPopupNode = e.target.ownerDocument.popupNode;
	if (cPopupNode.getAttribute('id') == 'cui_nativeshot') {

		var cToolbarContextMenu_dashboardMenuitem = e.target.querySelector('#' + gToolbarContextMenu_domId + gDashboardMenuitem_domIdSuffix);
		if (cToolbarContextMenu_dashboardMenuitem) {
			var cToolbarContextMenu_dashboardSeperator = e.target.querySelector('#' + gToolbarContextMenu_domId + gDashboardSeperator_domIdSuffix);
			cToolbarContextMenu_dashboardMenuitem.removeAttribute('hidden');
			cToolbarContextMenu_dashboardSeperator.removeAttribute('hidden');
			e.target.addEventListener('popuphiding', contextMenuHiding, false);
		}

		var cCustomizationPanelItemContextMenu_dashboardMenuitem = e.target.querySelector('#' + gCustomizationPanelItemContextMenu_domId + gDashboardMenuitem_domIdSuffix);
		if (cCustomizationPanelItemContextMenu_dashboardMenuitem) {
			var cCustomizationPanelItemContextMenu_dashboardSeperator = e.target.querySelector('#' + gCustomizationPanelItemContextMenu_domId + gDashboardSeperator_domIdSuffix);
			cCustomizationPanelItemContextMenu_dashboardMenuitem.removeAttribute('hidden');
			cCustomizationPanelItemContextMenu_dashboardSeperator.removeAttribute('hidden');
			e.target.addEventListener('popuphiding', contextMenuHiding, false);
		}

	}
}

function contextMenuSetup(aDOMWindow) {
	// if this aDOMWindow has the context menus set it up


	if (!gDashboardMenuitem_jsonTemplate[1].label) {
		gDashboardMenuitem_jsonTemplate[1].label = formatStringFromNameCore('menuitem_opendashboard', 'main'); // link988888887 - needs to go before windowListener is registered
	}

	var cToolbarContextMenu = aDOMWindow.document.getElementById(gToolbarContextMenu_domId);
	if (cToolbarContextMenu) {
		gDashboardMenuitem_jsonTemplate[1].id = gToolbarContextMenu_domId + gDashboardMenuitem_domIdSuffix;
		gDashboardMenuseperator_jsonTemplate[1].id = gToolbarContextMenu_domId + gDashboardSeperator_domIdSuffix;

		var cToolbarContextMenu_dashboardMenuitem = jsonToDOM(gDashboardMenuitem_jsonTemplate, aDOMWindow.document, {});
		var cToolbarContextMenu_dashboardSeperator = jsonToDOM(gDashboardMenuseperator_jsonTemplate, aDOMWindow.document, {});



		cToolbarContextMenu.insertBefore(cToolbarContextMenu_dashboardSeperator, cToolbarContextMenu.firstChild);
		cToolbarContextMenu.insertBefore(cToolbarContextMenu_dashboardMenuitem, cToolbarContextMenu.firstChild);

		cToolbarContextMenu.addEventListener('popupshowing', contextMenuShowing, false);
	}

	var cCustomizationPanelItemContextMenu = aDOMWindow.document.getElementById(gCustomizationPanelItemContextMenu_domId);
	if (cCustomizationPanelItemContextMenu) {

		gDashboardMenuitem_jsonTemplate[1].id = gCustomizationPanelItemContextMenu_domId + gDashboardMenuitem_domIdSuffix;
		gDashboardMenuseperator_jsonTemplate[1].id = gCustomizationPanelItemContextMenu_domId + gDashboardSeperator_domIdSuffix;

		var cCustomizationPanelItemContextMenu_dashboardMenuitem = jsonToDOM(gDashboardMenuitem_jsonTemplate, aDOMWindow.document, {});
		var cCustomizationPanelItemContextMenu_dashboardSeperator = jsonToDOM(gDashboardMenuseperator_jsonTemplate, aDOMWindow.document, {});



		cCustomizationPanelItemContextMenu.insertBefore(cCustomizationPanelItemContextMenu_dashboardSeperator, cCustomizationPanelItemContextMenu.firstChild);
		cCustomizationPanelItemContextMenu.insertBefore(cCustomizationPanelItemContextMenu_dashboardMenuitem, cCustomizationPanelItemContextMenu.firstChild);

		cCustomizationPanelItemContextMenu.addEventListener('popupshowing', contextMenuShowing, false);
	}

	// console.log('ok good setup');
}

function contextMenuDestroy(aDOMWindow) {
	// if this aDOMWindow has the context menus it removes it from it

	var cToolbarContextMenu = aDOMWindow.document.getElementById(gToolbarContextMenu_domId);
	if (cToolbarContextMenu) {
		var cToolbarContextMenu_dashboardMenuitem = aDOMWindow.document.getElementById(gToolbarContextMenu_domId + gDashboardMenuitem_domIdSuffix);
		var cToolbarContextMenu_dashboardSeperator = aDOMWindow.document.getElementById(gToolbarContextMenu_domId + gDashboardSeperator_domIdSuffix);

		cToolbarContextMenu.removeChild(cToolbarContextMenu_dashboardMenuitem);
		cToolbarContextMenu.removeChild(cToolbarContextMenu_dashboardSeperator);

		cToolbarContextMenu.removeEventListener('popupshowing', contextMenuShowing, false);
	}

	var cCustomizationPanelItemContextMenu = aDOMWindow.document.getElementById(gCustomizationPanelItemContextMenu_domId);
	if (cCustomizationPanelItemContextMenu) {
		var cCustomizationPanelItemContextMenu_dashboardMenuitem = aDOMWindow.document.getElementById(gCustomizationPanelItemContextMenu_domId + gDashboardMenuitem_domIdSuffix);
		var cCustomizationPanelItemContextMenu_dashboardSeperator = aDOMWindow.document.getElementById(gCustomizationPanelItemContextMenu_domId + gDashboardSeperator_domIdSuffix);

		cCustomizationPanelItemContextMenu.removeChild(cCustomizationPanelItemContextMenu_dashboardMenuitem);
		cCustomizationPanelItemContextMenu.removeChild(cCustomizationPanelItemContextMenu_dashboardSeperator);

		cCustomizationPanelItemContextMenu.removeEventListener('popupshowing', contextMenuShowing, false);
	}

	// console.log('ok good destroyed');

}
// end - context menu items

var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
		aDOMWindow.addEventListener('load', function () {
			aDOMWindow.removeEventListener('load', arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {
		// console.error('title changed to:', aNewTitle);
		if (aNewTitle == 'nativeshot_canvas') {
			var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
			// aDOMWindow.document.documentElement.style.backgroundColor = 'transparent';
			aDOMWindow.addEventListener('nscomm', function(e) {
				aDOMWindow.removeEventListener('nscomm', arguments.callee, false);
				// console.log('got nscomm', e.detail);
				var detail = e.detail;
				var iMon = detail;
				var shot = gSession.shots[iMon];
				shot.comm = new Comm.server.content(aDOMWindow, editorInitShot.bind(null, iMon), shot.port1, shot.port2);
			}, false, true);
		}
	},
	register: function () {

		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				windowListener.loadIntoWindow(aDOMWindow);
			} else {
				aDOMWindow.addEventListener('load', function () {
					aDOMWindow.removeEventListener('load', arguments.callee, false);
					windowListener.loadIntoWindow(aDOMWindow);
				}, false);
			}
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.unloadFromWindow(aDOMWindow);
		}
		/*
		for (var u in unloaders) {
			unloaders[u]();
		}
		*/
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow) {
		if (!aDOMWindow) { return }

            // desktop_android:insert_gui
			if (core.os.name != 'android') {
                // desktop:insert_gui
				if (aDOMWindow.gBrowser) {
					var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
					domWinUtils.loadSheet(gCuiCssUri, domWinUtils.AUTHOR_SHEET);
					domWinUtils.loadSheet(gGenCssUri, domWinUtils.AUTHOR_SHEET);
				}

				contextMenuSetup(aDOMWindow);
			} else {
                // android:insert_gui
				if (aDOMWindow.NativeWindow && aDOMWindow.NativeWindow.menu) {
					var menuid = aDOMWindow.NativeWindow.menu.add(formatStringFromNameCore('gui_label', 'main'), core.addon.path.images + 'icon-color16.png', guiClick)
					gAndroidMenus.push({
						domwin: Cu.getWeakReference(aDOMWindow),
						menuid
					});
				}
			}
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) { return }

        // desktop:insert_gui
        if (core.os.name != 'android') {
            if (aDOMWindow.gBrowser) {
				var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
				domWinUtils.removeSheet(gCuiCssUri, domWinUtils.AUTHOR_SHEET);
				domWinUtils.removeSheet(gGenCssUri, domWinUtils.AUTHOR_SHEET);
			}

			contextMenuDestroy(aDOMWindow);
        }
	}
};

function copy(aString) {
	// aString is either dataurl, or string to copy to clipboard
	if (!aString.startsWith('data:')) {
		// copy as text
		CLIPBOARD.set(aString, 'text');
	} else {
		// copy as image
		CLIPBOARD.set(aString, 'image');
	}
}

function print(aArg) {
	var { aPrintPreview, aDataUrl } = aArg;
	// aPrintPreview - true for print preview, else false

	var aWin;
	if (aPrintPreview) {
		aWin = Services.ww.openWindow(null, 'chrome://browser/content/browser.xul', '_blank', null, null);
		aWin.addEventListener('load', printWinLoad, false);
	} else {
		aWin = Services.wm.getMostRecentWindow('navigator:browser');
		printWinLoad(Object.assign(aArg, {aWin}));
	}

	var aFrame;
	function printWinLoad(e) {
		console.error('printWinLoad e:', e);
		if (aPrintPreview) {
			aWin.removeEventListener('load', printWinLoad, false);
		}
		aWin.focus();

		var doc = aWin.document;
		aFrame = doc.createElementNS(NS_XUL, 'browser');
		aFrame.addEventListener('load', printFrameLoad, true); // if i use `false` here it doesnt work

		aFrame.setAttribute('type', 'content');
		aFrame.setAttribute('src', aDataUrl);
		aFrame.setAttribute('style', 'display:none'); // if dont do display none, then have to give it a height and width enough to show it, otherwise print preview is blank
		doc.documentElement.appendChild(aFrame); // src page wont load until i append to document
	}

	function printFrameLoad(e) {
		console.error('in printFrameLoad, e:', e);
		aFrame.removeEventListener('load', printFrameLoad, true); // as i added with `true`

		if (aPrintPreview) {
			var aPPListener = aWin.PrintPreviewListener;
			var aOrigPPgetSourceBrowser = aPPListener.getSourceBrowser;
			var aOrigPPExit = aPPListener.onExit;
			aPPListener.onExit = function() {
				aOrigPPExit.call(aPPListener);
				// aFrame.parentNode.removeChild(aFrame);
				// aPPListener.onExit = aOrigPPExit;
				// aPPListener.getSourceBrowser = aOrigPPgetSourceBrowser;
				aWin.close();
			};
			aPPListener.getSourceBrowser = function() {
				return aFrame;
			};
			aWin.PrintUtils.printPreview(aPPListener);
		} else {
			aFrame.contentWindow.addEventListener('afterprint', printFrameAfterPrint, false);
			aFrame.contentWindow.print();
		}
	}

	function printFrameAfterPrint(e) {
		// only for if `!aPrintPreview`
		console.error('in FrameAfterPrint, e:', e);
		aFrame.setAttribute('src', 'about:blank');
		// callInMainworker('bootstrapTimeout', 5 * 60 * 1000)
	}
}

function reverseImageSearch(aArg) {
	var { path, postdata, url, actionid } = aArg;

	for (var p in postdata) {
		if (postdata[p] == 'nsifile') {
			postdata[p] = new nsIFile(path);
			break;
		}
	}

	var tab = Services.wm.getMostRecentWindow('navigator:browser').gBrowser.loadOneTab(url, {
		inBackground: false,
		postData: encodeFormData(postdata, 'iso8859-1')
	});
	tab.setAttribute('nativeshot_actionid', actionid);
}

function getAddonInfo(aAddonId=core.addon.id) {
	var deferredmain_getaddoninfo = new Deferred();
	AddonManager.getAddonByID(aAddonId, addon =>
		deferredmain_getaddoninfo.resolve({
			applyBackgroundUpdates: parseInt(addon.applyBackgroundUpdates) === 1 ? (parseInt(AddonManager.autoUpdateDefault) ? 2 : 0) : parseInt(addon.applyBackgroundUpdates),
			updateDate: addon.updateDate.getTime(),
			version: addon.version
		})
	);

	return deferredmain_getaddoninfo.promise;
}

function setApplyBackgroundUpdates(aNewApplyBackgroundUpdates) {
	// 0 - off, 1 - respect global setting, 2 - on
	AddonManager.getAddonByID(core.addon.id, addon =>
		addon.applyBackgroundUpdates = aNewApplyBackgroundUpdates
	);
}
// start - Comm functions
function processAction(aArg, aReportProgress) {
	// called by content
	// aReportProgress is undefined if editor is not waiting for progress updates
	shot = aArg;

	// create attn bar entry
	if (core.os.name != 'android') {
		attnUpdate(shot.sessionid, {
			actionid: shot.actionid,
			serviceid: shot.serviceid, // crossfile-link3399
			reason: 'INIT'
		});

		// callInMainworker('bootstrapTimeout', 1000, function() {
		// 	attnUpdate(shot.sessionid, {
		// 		actionid: shot.actionid,
		// 		serviceid: shot.serviceid,
		// 		reason: 'SUCCESS'
		// 	});
		// });
	}

	var deferred_processed = (aReportProgress ? new Deferred() : undefined);

	callInMainworker('processAction', shot, workerProcessActionCallback.bind(null, shot, deferred_processed, aReportProgress));

	return (aReportProgress ? deferred_processed.promise : undefined);
}

function workerProcessActionCallback(shot, aDeferredProcess, aReportProgress, aArg2) {
	var { __PROGRESS } = aArg2;
	// aArg2 does NOT need serviceid in it everytime, only if changing then it needs serviceid
	// update attn bar
	if (core.os.name != 'android') {
		attnUpdate(shot.sessionid, Object.assign(
			{ actionid:shot.actionid }, // crossfile-link393
			aArg2
		));
	}

	if (aReportProgress) {
		if (__PROGRESS && gSession.id && gSession.id == shot.sessionid) {
			// editor is still open, so tell it about the progress
			aReportProgress(aArg2);
		} else {
			aDeferredProcess.resolve('resolved content processAction progress updates');
		}
	}

}
// end - Comm functions

function attnUpdate(aSessionId, aUpdateInfo) {
	// aUpdateInfo pass as undefined/null if you want to just show attnbar
	/*
	aUpdateInfo
		{
			actionid, // each actionid gets its own button
			// no need - sessionid, // redundant as i have first arg of this functi on as aSessionId
			serviceid,
			reason,
			data - arbitrary, like for twitter it can hold array of urls
		}
	*/
	/* reason enum[
		INIT
	]
	*/
	var entry = gAttn[aSessionId];

	if (aUpdateInfo) {
		var { actionid, serviceid, reason, data } = aUpdateInfo;
		console.error('got update info!', 'aSessionId:', aSessionId, 'actionid:', actionid, 'serviceid:', serviceid, 'reason:', reason, 'data:', data);
		// check should create entry?
		if (!entry) {
			entry = {
				state: { // this is live reference being used to AB.setState
					aTxt: (new Date(aSessionId).toLocaleString()),
					aPriority: 1,
					aIcon: core.addon.path.images + 'icon16.png',
					aBtns: [], // each entry is an object. so i give it a key `meta` which is ignored by the AttnBar module
					aClose: function() {
						delete gAttn[aSessionId];
					}
				},
				shown: false
			};
			gAttn[aSessionId] = entry;
		}

		// get btn for this actionid - if not there then leave it at undefined
		var btns = entry.state.aBtns;
		var btn;
		for (btn of btns) {
			if (btn.meta.actionid === actionid) {
				break;
			} else {
				btn = undefined;
			}
		}

		// check if should add btn
		if (!btn) {
			btn = {
				bClick: attnBtnClick,
				bTxt: 'uninitialized',
				meta: { // for use when attnBtnClick access this.btn.meta
					actionid
				}
			};
			btns.push(btn);
		}

		// always update btn based on serviceid, reason, and data
		var meta = btn.meta;
		if (serviceid) {
			meta.serviceid = serviceid;
		}
		meta.reason = reason;
		if (data) {
			meta.data = data;
		}
		switch (reason) {
			case 'INIT':
					btn.bTxt = formatStringFromNameCore('initializing', 'main');
					btn.bIcon = core.addon.path.images + meta.serviceid + '16.png';
					btn.bDisabled = true;
					btn.bType = 'button';

				break;
			case 'PROCESSING':
					btn.bTxt = formatStringFromNameCore('processing', 'main'),
					btn.bDisabled = true;
					btn.bType = 'button';
				break;
			case 'TWEETING':
					btn.bTxt = formatStringFromNameCore('tweeting', 'main'),
					btn.bDisabled = false;
					btn.bType = 'button';
				break;
			case 'HOLD_USER_TWEET_NEEDED':
					btn.bTxt = formatStringFromNameCore('hold_user_tweet_needed', 'main'),
					btn.bDisabled = false;
					btn.bType = 'button';
				break;
			case 'UPLOAD_INIT':
					btn.bTxt = formatStringFromNameCore('upload_init', 'main'),
					btn.bDisabled = false;
					btn.bType = 'button';
				break;
			case 'UPLOAD_GETTING_LINK':
					btn.bTxt = formatStringFromNameCore('upload_getting_link', 'main'),
					btn.bDisabled = false;
					btn.bType = 'button';
				break;
			case 'UPLOAD_GETTING_META':
					btn.bTxt = formatStringFromNameCore('upload_getting_meta', 'main'),
					btn.bDisabled = false;
					btn.bType = 'button';
				break;
			case 'UPLOAD_RETRY_WAIT':
					btn.bTxt = 'Upload Failed - Will Retry in ' + data.countdown + 'sec - Cancel'; // TODO: l10n
					btn.bDisabled = false;
					btn.bType = 'button';
				break;
			case 'UPLOAD_PROGRESS':
					// set bTxt
					var has_upload_percent = ('upload_percent' in data);
					var has_upload_size = ('upload_size' in data);
					var has_upload_sizetotal = ('upload_sizetotal' in data);
					if (has_upload_percent && has_upload_size && has_upload_sizetotal) {
						btn.bTxt = 'Uploading - ' + data.upload_percent + '% - ' + data.upload_size + ' / ' + data.upload_sizetotal + '- Cancel'; // TODO: l10n
					} else if (has_upload_size && has_upload_sizetotal) {
						btn.bTxt = 'Uploading - ' + data.upload_size + ' / ' + data.upload_sizetotal + '- Cancel'; // TODO: l10n
					} else if (has_upload_size) {
						btn.bTxt = 'Uploading - ' + data.upload_size + ' - Cancel'; // TODO: l10n
					} else {
						btn.bTxt = 'Uploading - Cancel';
					}

					// set other stuff
					btn.bDisabled = false;
					btn.bType = 'button';
				break;
			case 'CANCELLED':
					btn.bDisabled = undefined;
					btn.bType = 'button';
					btn.bTxt = formatStringFromNameCore('cancelled', 'main');
				break;
			case 'SUCCESS':
					btn.bDisabled = undefined;
					btn.bType = 'button';

					console.log('meta.serviceid:', meta.serviceid);
					var success_suffix = core.nativeshot.services[meta.serviceid].type;
					switch (meta.serviceid) {
						case 'copy':
						case 'print':
								success_suffix = meta.serviceid;
							break;
						case 'twitter':
								success_suffix = meta.serviceid;
								btn.bType = 'menu-button';
								btn.bMenu = [];
								meta.data.link_images.forEach((img_link, i) => {
									btn.bMenu.push({
										cTxt: formatStringFromNameCore('copy_imagelink_num', 'main', [i+1]),
										meta: {
											data: {
												copytxt: img_link
											}
										}
									});
								});
							break;
						case 'savebrowse':
						case 'savequick':
								btn.bType = 'menu-button';
								btn.bMenu = [];
								btn.bMenu.push({
									cTxt: formatStringFromNameCore('show_in_explorer', 'main')
								});
							break;
					}
					btn.bTxt = formatStringFromNameCore('success_' + success_suffix, 'main');

				break;
			case 'HOLD_ERROR':
					// HOLD_ means user can resume this error, but user input is needed
					// if I make a 'ERROR' reason, then that is permanent fail, unrecoverable by user, but i dont plan for this unrecoverable nature
					btn.bDisabled = undefined;
					btn.bType = 'menu-button';
					btn.bTxt = formatStringFromNameCore('hold_error', 'main')
					// offer menu to display error, or to switch to any of the other services
					btn.bMenu = [];
					btn.bMenu.push({
						cTxt: formatStringFromNameCore('retry', 'main')
					});
					btn.bMenu.push({
						cTxt: formatStringFromNameCore('show_error_details', 'main')
					});
					btn.bMenu.push({
						cSeperator: true
					});

					// add the alternative services
					addAltServiceMenuitems(btn.bMenu, meta.serviceid);

				break;
			case 'HOLD_UNHANDLED_STATUS_CODE':
					btn.bDisabled = undefined;
					btn.bType = 'menu-button';
					btn.bTxt = formatStringFromNameCore('hold_unhandled_status_code', 'main')

					// offer menu to display error, or to switch to any of the other services
					btn.bMenu = [];
					btn.bMenu.push({
						cTxt: formatStringFromNameCore('retry', 'main')
					});
					btn.bMenu.push({
						cTxt: formatStringFromNameCore('show_response_details', 'main')
					});
					btn.bMenu.push({
						cSeperator: true
					});

					// add the alternative services
					addAltServiceMenuitems(btn.bMenu, meta.serviceid);
				break;
			case 'HOLD_USER_AUTH_NEEDED':

					btn.bDisabled = undefined;
					btn.bType = 'button';
					btn.bTxt = formatStringFromNameCore('hold_user_auth_needed', 'main');

				break;
			case 'UPLOAD_GETTING_USER':

				btn.bDisabled = undefined;
				btn.bType = 'button';
				btn.bTxt = formatStringFromNameCore('upload_getting_user', 'main');

				break;
			case 'HOLD_GETTING_USER':

					btn.bDisabled = undefined;
					btn.bType = 'button';
					btn.bTxt = formatStringFromNameCore('hold_getting_user', 'main');

				break;
		}
		switch (serviceid) {
			// special stuff for serviceid
		}

		// give each menuitem the attnMenuClick
		if (btn.bMenu) {
			for (var menuitem of btn.bMenu) {
				if (!menuitem.cSeperator && !menuitem.cMenu) { // seperators and mainmenu (items with submenu) dont get click events
					menuitem.cClick = attnMenuClick;
				}
			}
		}
	}

	// should show it?
	if (entry && !entry.shown && gSession.id !== aSessionId) { // `entry &&` because if there is no aUpdateInfo was ever provided, then there is no bar to show. and when `exitEditors` calls `updateAttn(sessionid)` meaning without 2nd arg, it will find there is nothing to show
		gAttn[aSessionId].state = AB.setState(entry.state);
	}
}

function attnBtnClick(doClose, aBrowser) {
	// handler for btn click of all btns
	// this == {inststate:aInstState, btn:aInstState.aBtns[i]}
	console.log('attn btn clicked, this:', this);

	console.error('this.btn.meta:', this.btn.meta);
	var { actionid, serviceid, reason, data } = this.btn.meta;
	switch (reason) {
		case 'SUCCESS':
				if (data) {
					if (data.copytxt) {
						copy(data.copytxt);
					} else if (data.print_dataurl) {
						callInMainworker('fetchFilestoreEntry', {mainkey:'prefs', key:'print_preview'}, function(aPrintPreview) {
							print({
								aPrintPreview,
								aDataUrl: data.print_dataurl
							});
						});
					}
				}
			break;
		case 'HOLD_USER_TWEET_NEEDED':
				var msg = {value:''};
				var result = Services.prompt.prompt(Services.wm.getMostRecentWindow('navigator:browser'), 'NativeShot - Tweet Message', 'Type a message you want to Tweet these images with:', msg, null, {});
				if (result) {
					callInMainworker('withHoldResume', {
						actionid_serviceid: this.btn.meta.actionid,
						reason: 'HOLD_USER_TWEET_NEEDED',
						action_options: {
							tweet_msg: msg.value
						}
					});
				}
			break;
	}


	// do it based on the bTxt
	switch (this.btn.bTxt) {
		case formatStringFromNameCore('hold_user_auth_needed', 'main'):
				callInMainworker('openAuthTab', this.btn.meta.serviceid);
			break;
		case formatStringFromNameCore('hold_error', 'main'):
		case formatStringFromNameCore('hold_unhandled_status_code', 'main'):
				callInMainworker('withHoldResume', {
					actionid_serviceid: this.btn.meta.actionid,
					reason: this.btn.meta.reason
				});
			break;
		case formatStringFromNameCore('success_ocr', 'main'):
				var window = Services.wm.getMostRecentWindow('navigator:browser');
				window.gBrowser.loadOneTab('about:nativeshot?text=' + this.btn.meta.actionid, {
					inBackground: false
				});
			break;
		case formatStringFromNameCore('success_search', 'main'):
				var windows = Services.wm.getEnumerator('navigator:browser');
				while (windows.hasMoreElements()) {
					var window = windows.getNext();
					var tabs = window.gBrowser.tabContainer.childNodes;
					for (var tab of tabs) {
						if (tab.getAttribute('nativeshot_actionid') == this.btn.meta.actionid) {
							window.focus();
							window.gBrowser.selectedTab = tab;
							return;
						}
					}
				}
			break;
	}
}

function attnMenuClick(doClose, aBrowser) {
	// handler for menuitem click of all menuitem
	// this == {inststate:AB.Insts[aCloseCallbackId].state, btn:aBtnEntry, menu:jMenu, menuitem:jEntry}
	console.log('attn menu clicked, this:', this);
	// do it based on the bTxt
	if (this.menuitem.meta.data.copytxt) {
		copy(this.menuitem.meta.data.copytxt);
	} else {
		switch (this.menuitem.cTxt) {
			case formatStringFromNameCore('show_in_explorer', 'main'):
					showFileInOSExplorer(new nsIFile(this.btn.meta.data.copytxt));
				break;
		}
	}
}

function addAltServiceMenuitems(aBtnsArr, aSkipServiceid) {
	var ignore_menuitem_txt = formatStringFromNameCore(aSkipServiceid, 'main');

	var mainmenu_txts = [];
	var submenu_txts = {};
	for (var a_service in core.nativeshot.services) {
		var menu_txt = formatStringFromNameCore(core.nativeshot.services[a_service].type, 'main');
		if (!mainmenu_txts.includes(menu_txt)) {
			mainmenu_txts.push(menu_txt);
		}

		if (!submenu_txts[menu_txt]) {
			submenu_txts[menu_txt] = [];
		}
		submenu_txts[menu_txt].push(formatStringFromNameCore(a_service, 'main'));
	}
	mainmenu_txts.sort();

	for (var menu_txt of mainmenu_txts) {
		var btns_entry = {
			cTxt: menu_txt,
			cMenu: []
		};
		var menuitem_txts = submenu_txts[menu_txt];
		menuitem_txts.sort();
		for (var txt of menuitem_txts) {
			if (txt != ignore_menuitem_txt) {
				btns_entry.cMenu.push({
					cTxt: txt,
					cClick: attnMenuClick
				});
			}
		}

		if (btns_entry.cMenu.length) {
			aBtnsArr.push(btns_entry);
		}
	}
}

function getServiceFromCode(servicecode) {
	// exact copy in bootstrap.js, MainWorker.js, app_history.js
	// console.log('getting service from id of:', servicecode);
	for (var a_serviceid in core.nativeshot.services) {
		if (core.nativeshot.services[a_serviceid].code === servicecode) {
			return {
				serviceid: a_serviceid,
				entry: core.nativeshot.services[a_serviceid]
			};
		}
	}
}

var gUsedURIs = {};
var gNextURI_i = 0;
function makeResourceURI(aFileURI) {
	if (!gUsedURIs[aFileURI]) {
		var uri = Services.io.newURI(aFileURI, null, null);
		gUsedURIs[aFileURI] = 'nativeshot_file' + (gNextURI_i++);
		Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler).setSubstitution(gUsedURIs[aFileURI], uri);
	}
	return 'resource://' + gUsedURIs[aFileURI];
}

function releaseAllResourceURI() {
	for (var i=0; i<gNextURI_i; i++) {
		Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler).setSubstitution('nativeshot_file' + i, null);
	}
}

function launchOrFocusOrReuseTab(aArg, aReportProgress, aComm) {
	var { url, reuse_criteria } = aArg;

	// search all tabs for url, if found then focus that tab
	var focused = false;
	var windows = Services.wm.getEnumerator('navigator:browser');
	while (windows.hasMoreElements()) {
		var window = windows.getNext();
		var tabs = window.gBrowser.tabContainer.childNodes;
		for (var tab of tabs) {
			var browser = tab.linkedBrowser;
			if (browser.currentURI.spec.toLowerCase() == url.toLowerCase()) {
				window.focus();
				window.gBrowser.selectedTab = tab;
				focused = true;
				return;
			}
		}
	}

	// if not found then search all tabs for reuse_criteria, on first find, use that tab and load this url (if its not already this url)
	var reused = false;
	if (!focused && reuse_criteria) {
		var windows = Services.wm.getEnumerator('navigator:browser');
		while (windows.hasMoreElements()) {
			var window = windows.getNext();
			var tabs = window.gBrowser.tabContainer.childNodes;
			for (var tab of tabs) {
				var browser = tab.linkedBrowser;
				for (var i=0; i<reuse_criteria.length; i++) {
					if (browser.currentURI.spec.toLowerCase().includes(reuse_criteria[i].toLowerCase())) {
						window.focus();
						window.gBrowser.selectedTab = tab;
						if (browser.currentURI.spec.toLowerCase() != url.toLowerCase()) {
							browser.loadURI(url);
						}
						reused = true;
						return;
					}
				}
			}
		}
	}

	// if nothing found for reuse then launch url in foreground of most recent browser
	if (!reused) {
		var window = Services.wm.getMostRecentWindow('navigator:browser');
		window.gBrowser.loadOneTab(url, { inBackground:false, relatedToCurrent:true });
	}

}

// rev3 - https://gist.github.com/Noitidart/feeec1776c6ee4254a34
function showFileInOSExplorer(aNsiFile, aDirPlatPath, aFileName) {
	// can pass in aNsiFile
	if (aNsiFile) {
		//http://mxr.mozilla.org/mozilla-release/source/browser/components/downloads/src/DownloadsCommon.jsm#533
		// opens the directory of the aNsiFile

		if (aNsiFile.isDirectory()) {
			aNsiFile.launch();
		} else {
			aNsiFile.reveal();
		}
	} else {
		var cNsiFile = new nsIFile(aDirPlatPath);

		if (!aFileName) {
			// its a directory
			cNsiFile.launch();
		} else {
			cNsiFile.append(aFileName);
			cNsiFile.reveal();
		}
	}
}

function loadOneTab(aArg, aReportProgress, aComm) {
	var window = Services.wm.getMostRecentWindow('navigator:browser');
	window.gBrowser.loadOneTab(aArg.URL, aArg.params);

	/* example usage
	callInBootstrap('loadOneTab', {
		URL: 'https://www.facebook.com',
		params: {
			inBackground: false
		}
	});
	*/
}

function browseFile(aArg, aReportProgress, aComm, aMessageManager, aBrowser) {
	// rev4 - https://gist.github.com/Noitidart/91b9a7ce5ff6ee7f8329c4d71cc5943b

	// called by worker, or by framescript in which case it has aMessageManager and aBrowser as final params
	var { aDialogTitle, aOptions } = aArg
	if (!aOptions) { aOptions={} }

	// uses xpcom file browser and returns path to file selected
	// returns
		// filename
		// if aOptions.returnDetails is true, then it returns object with fields:
		//	{
		//		filepath: string,
		//		replace: bool, // only set if mode is modeSave
		//	}

	var cOptionsDefaults = {
		mode: 'modeOpen', // modeSave, modeGetFolder,
		filters: undefined, // else an array. in sets of two. so one filter would be ['PNG', '*.png'] or two filters woul be ['PNG', '*.png', 'All Files', '*']
		startDirPlatPath: undefined, // string - platform path to dir the dialog should start in
		returnDetails: false,
		async: false, // if set to true, then it wont block main thread while its open, and it will also return a promise
		win: undefined, // null for no parentWin, string for what you want passed to getMostRecentWindow, or a window object. NEGATIVE is special for NativeShot, it is negative iMon
		defaultString: undefined
	}

	aOptions = Object.assign(cOptionsDefaults, aOptions);

	var fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);

	var parentWin;
	if (aOptions.win === undefined) {
		parentWin = null;
	} else if (typeof(aOptions.win) == 'number') {
		// sepcial for nativeshot
		// parentWin = colMon[Math.abs(aOptions.win)].E.DOMWindow;
		parentWin = gSession.shots[aOptions.win].domwin;
	} else if (aOptions.win === null || typeof(aOptions.win) == 'string') {
		parentWin = Services.wm.getMostRecentWindow(aOptions.win);
	} else {
		parentWin = aOptions.win; // they specified a window probably
	}
	fp.init(parentWin, aDialogTitle, Ci.nsIFilePicker[aOptions.mode]);

	if (aOptions.filters) {
		for (var i=0; i<aOptions.filters.length; i=i+2) {
			fp.appendFilter(aOptions.filters[i], aOptions.filters[i+1]);
		}
	}

	if (aOptions.startDirPlatPath) {
		fp.displayDirectory = new nsIFile(aOptions.startDirPlatPath);
	}

	var fpDoneCallback = function(rv) {
		var retFP;
		if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) {

			if (aOptions.returnDetails) {
				var cBrowsedDetails = {
					filepath: fp.file.path,
					filter: aOptions.filters ? aOptions.filters[(fp.filterIndex * 2) + 1] : undefined,
					replace: aOptions.mode == 'modeSave' ? (rv == Ci.nsIFilePicker.returnReplace) : undefined
				};

				retFP = cBrowsedDetails;
			} else {
				retFP = fp.file.path;
			}

		}// else { // cancelled	}
		if (aOptions.async) {
			console.error('async resolving');
			mainDeferred_browseFile.resolve(retFP);
		} else {
			return retFP;
		}
	}

	if (aOptions.defaultString) {
		fp.defaultString = aOptions.defaultString;
	}

	if (aOptions.async) {
		var mainDeferred_browseFile = new Deferred();
		fp.open({
			done: fpDoneCallback
		});
		return mainDeferred_browseFile.promise;
	} else {
		return fpDoneCallback(fp.show());
	}
}

function encodeFormData(data, charset, forArrBuf_nameDotExt, forArrBuf_mimeType) {
	// http://stackoverflow.com/a/25020668/1828637

	var encoder = Cc["@mozilla.org/intl/saveascharset;1"].createInstance(Ci.nsISaveAsCharset);
	encoder.Init(charset || "utf-8", Ci.nsISaveAsCharset.attr_EntityAfterCharsetConv + Ci.nsISaveAsCharset.attr_FallbackDecimalNCR, 0);
	var encode = function(val, header) {
		val = encoder.Convert(val);
		if (header) {
			val = val.replace(/\r\n/g, " ").replace(/"/g, "\\\"");
		}
		return val;
	}

	var boundary = "----boundary--" + Date.now();
	var mpis = Cc['@mozilla.org/io/multiplex-input-stream;1'].createInstance(Ci.nsIMultiplexInputStream);

	var item = "";
	for (var k of Object.keys(data)) {
		item += "--" + boundary + "\r\n";
		var v = data[k];

		if (v instanceof Ci.nsIFile) {

			var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
			fstream.init(v, -1, -1, Ci.nsIFileInputStream.DELETE_ON_CLOSE);
			item += "Content-Disposition: form-data; name=\"" + encode(k, true) + "\";" + " filename=\"" + encode(v.leafName, true) + "\"\r\n";

			var ctype = "application/octet-stream";
			try {
				var mime = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
				ctype = mime.getTypeFromFile(v) || ctype;
			} catch (ex) {
				console.warn("failed to get type", ex);
			}
			item += "Content-Type: " + ctype + "\r\n\r\n";

			var ss = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
			ss.data = item;

			mpis.appendStream(ss);
			mpis.appendStream(fstream);

			item = "";

		} else {
			console.error('in else');
			item += "Content-Disposition: form-data; name=\"" + encode(k, true) + "\"\r\n\r\n";
			item += encode(v);

		}
		item += "\r\n";
	}

	item += "--" + boundary + "--\r\n";
	var ss = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
	ss.data = item;
	mpis.appendStream(ss);

	var postStream = Cc["@mozilla.org/network/mime-input-stream;1"].createInstance(Ci.nsIMIMEInputStream);
	postStream.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	postStream.setData(mpis);
	postStream.addContentLength = true;

	return postStream;
}

function closeSelfTab(aArg, aReportProgress, aComm, aMessageManager, aBrowser) {
	// var domwins = Services.wm.getEnumerator(null);
	// while (DOMWindows.hasMoreElements()) {
	// 	var a_domwin = domwins.getNext();
	// 	var gbrowser = a_domwin.gBrowser;
	// 	if (gbrowser) {
	// 		var tab = gbrowser.getTabForBrowser(aBrowser);
	// 		if (tab) {
	// 			gbrowser.removeTab(tab);
	// 			console.error('TAB CLOSE DONE');
	// 			return true;
	// 		}
	// 	}
	// }
	var domwin = aBrowser.ownerDocument.defaultView;
	var gbrowser = domwin.gBrowser;
	var tab = gbrowser.getTabForBrowser(aBrowser);
	gbrowser.removeTab(tab);
	// console.error('TAB NOT FOUND FOR CLOSE');
}

function extractData(aActionId) {
	// returns null if not available
	console.log('aActionId:', aActionId);

	entries_loop:
	for (var a_sessionid in gAttn) {
		var btns = gAttn[a_sessionid].state.aBtns;
		if (btns) {
			for (var btn of btns) {
				if (btn.meta.actionid === aActionId) {
					break entries_loop;
				}
			}
		}
	}

	if (!btn || btn.meta.actionid !== aActionId) {
		return null;
	} else {
		if (btn.meta.data.arrbuf) {
			// btn.meta.data.__XFER = 'arrbuf';
		}
		return btn.meta.data;
	}
}

// start - common helper functions
function Deferred() {
	this.resolve = null;
	this.reject = null;
	this.promise = new Promise(function(resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this));
	Object.freeze(this);
}
function genericReject(aPromiseName, aPromiseToReject, aReason) {
	var rejObj = {
		name: aPromiseName,
		aReason: aReason
	};
	console.error('Rejected - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
function genericCatch(aPromiseName, aPromiseToReject, aCaught) {
	var rejObj = {
		name: aPromiseName,
		aCaught: aCaught
	};
	console.error('Caught - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
function formatStringFromNameCore(aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements) {
	// 051916 update - made it core.addon.l10n based
    // formatStringFromNameCore is formating only version of the worker version of formatStringFromName, it is based on core.addon.l10n cache

	try { var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr]; if (!cLocalizedStr) { throw new Error('localized is undefined'); } } catch (ex) { console.error('formatStringFromNameCore error:', ex, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements); } // remove on production

	var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr];
	// console.log('cLocalizedStr:', cLocalizedStr, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements);
    if (aReplacements) {
        for (var i=0; i<aReplacements.length; i++) {
            cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
        }
    }

    return cLocalizedStr;
}
function getSystemDirectory_bootstrap(type) {
	// progrmatic helper for getSystemDirectory in MainWorker - devuser should NEVER call this himself
	return Services.dirsvc.get(type, Ci.nsIFile).path;
}

// specific to nativeshot helper functions
function jsonToDOM(json, doc, nodes) {

    var namespaces = {
        html: 'http://www.w3.org/1999/xhtml',
        xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
    };
    var defaultNamespace = namespaces.html;

    function namespace(name) {
        var m = /^(?:(.*):)?(.*)$/.exec(name);
        return [namespaces[m[1]], m[2]];
    }

    function tag(name, attr) {
        if (Array.isArray(name)) {
            var frag = doc.createDocumentFragment();
            Array.forEach(arguments, function (arg) {
                if (!Array.isArray(arg[0]))
                    frag.appendChild(tag.apply(null, arg));
                else
                    arg.forEach(function (arg) {
                        frag.appendChild(tag.apply(null, arg));
                    });
            });
            return frag;
        }

        var args = Array.slice(arguments, 2);
        var vals = namespace(name);
        var elem = doc.createElementNS(vals[0] || defaultNamespace, vals[1]);

        for (var key in attr) {
            var val = attr[key];
            if (nodes && key == 'id')
                nodes[val] = elem;

            vals = namespace(key);
            if (typeof val == 'function')
                elem.addEventListener(key.replace(/^on/, ''), val, false);
            else
                elem.setAttributeNS(vals[0] || '', vals[1], val);
        }
        args.forEach(function(e) {
            try {
                elem.appendChild(
                                    Object.prototype.toString.call(e) == '[object Array]'
                                    ?
                                        tag.apply(null, e)
                                    :
                                        e instanceof doc.defaultView.Node
                                        ?
                                            e
                                        :
                                            doc.createTextNode(e)
                                );
            } catch (ex) {
                elem.appendChild(doc.createTextNode(ex));
            }
        });
        return elem;
    }
    return tag.apply(null, json);
}
function isFocused(window) {
    let childTargetWindow = {};
    Services.focus.getFocusedElementForWindow(window, true, childTargetWindow);
    childTargetWindow = childTargetWindow.value;

    let focusedChildWindow = {};
    if (Services.focus.activeWindow) {
        Services.focus.getFocusedElementForWindow(Services.focus.activeWindow, true, focusedChildWindow);
        focusedChildWindow = focusedChildWindow.value;
    }

    return (focusedChildWindow === childTargetWindow);
}


// rev1 - https://gist.github.com/Noitidart/c4ab4ca10ff5861c720b
var jQLike = { // my stand alone jquery like functions
	serialize: function(aSerializeObject) {
		// https://api.jquery.com/serialize/

		// verified this by testing
			// http://www.w3schools.com/jquery/tryit.asp?filename=tryjquery_ajax_serialize
			// http://www.the-art-of-web.com/javascript/escape/

		var serializedStrArr = [];
		for (var cSerializeKey in aSerializeObject) {
			serializedStrArr.push(encodeURIComponent(cSerializeKey) + '=' + encodeURIComponent(aSerializeObject[cSerializeKey]));
		}
		return serializedStrArr.join('&');
	}
};
function getNativeHandlePtrStr(aDOMWindow) {
	var aDOMBaseWindow = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor)
								   .getInterface(Ci.nsIWebNavigation)
								   .QueryInterface(Ci.nsIDocShellTreeItem)
								   .treeOwner
								   .QueryInterface(Ci.nsIInterfaceRequestor)
								   .getInterface(Ci.nsIBaseWindow);
	return aDOMBaseWindow.nativeHandle;
}

function getStrongReference(aWkRef) {
	// returns null when it doesnt exist
	var strongRef;
	try {
		strongRef = aWkRef.get();
		if (!strongRef) {
			// no longer exists
			console.error('weak ref is dead due to !:', strongRef);
			return null;
		}
	} catch(ex) {
		// it no longer exists
		console.error('weak ref is dead due to exception:', ex);
		return null;
	}
	return strongRef;
}
