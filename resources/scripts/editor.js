Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/Geometry.jsm');

var core = {
	addon: {
		name: 'NativeShot',
		id: 'NativeShot@jetpack',
		path: {
			scripts: 'chrome://nativeshot/content/resources/scripts/',
			styles: 'chrome://nativeshot/content/resources/styles/'
		},
		cache_key: Math.random()
	}
};

var gEditorStore = {};

function init(aArrBufAndCore) {
	// console.log('in screenshotXfer, aArrBufAndCore:', aArrBufAndCore);
	
	core = aArrBufAndCore.core;
	
	var palLayout = [ // the tools and order they should show in
		{
			// Handle - from where user can drag palette around
			label: undefined, // for non-special, this is the text cloud that shows on hover
			sub: undefined, // for non-special, this is the submenu items shown on hover. an array of objects
			icon: undefined, // for non-special, the icon that
			special: 'Handle' // this key is for special things that have their own React class
		},
		{
			// Accessibility - from where user increase/decrease size of palette
			special: 'Accessibility'
		},
		{
			special: 'Divider'
		},
		// selection tools
		{
			label: 'Select',
			icon: '\ue82c' // the fontello font code
		},
		{
			label: 'Fullscreen',
			icon: '\ue80e',
			hotkey: 'F', // hotkey does the currently set sub, in this case its fixed to current monitor (i should test which window the mouse is over)
			fixed: 'Current Monitor', // if not fixed, then the last clicked sub is used, if subs exist, and nothing is fixed, the default is the first one in the list
			sub: [
				{
					label: 'Current Monitor',
					fixedOnly: true // do not show as sub
				},
				{
					special: 'Monitors'
				}
			]
		},
		{
			label: 'Window Wand',
			icon: '\ue826'
		},
		{
			label: 'Last Selection',
			icon: '\ue82e',
			sub: [
				{
					special: 'SelectionHistory'
				}
			]
		},
		{
			label: 'Clear Selection',
			icon: '\ue82f'
		},
		{
			special: 'Divider'
		},
		// misc tools
		{
			label: 'Toggle Cursor',
			icon: '\ue822'
		},
		{
			label: 'Zoom View',
			icon: '\ue811',
			sub: [
				{
					special: 'ZoomViewLevel'
				}
			]
		},
		{
			special: 'Divider'
		},
		// draw tools
		{
			label: 'Freedraw',
			icon: '\ue830',
			sub: [
				{
					label: 'Pencil',
					icon: '\ue800'
				},
				{
					label: 'Highlighter', // this just its own remembered color and transparency - otherwise its a copy of pencil - im thinking cap the opacity at 10% - 90%
					icon: 'S'
				}
			]
		},
		{
			label: 'Shapes',
			icon: '\ue834',
			sub: [
				{
					label: 'Rectangle',
					icon: '\ue81d'
				},
				{
					label: 'Rounded Rectangle',
					icon: '\ue803'
				},
				{
					label: 'Circle',
					icon: '\ue81f'
				}
			]
		},
		{
			label: 'Line',
			icon: '\ue831',
			options: ['Arrow']
		},
		{
			label: 'Text',
			icon: 'S',
			sub: [
				{
					label: 'Free',
					icon: 'S'
				},
				{
					label: 'Container',
					icon: 'S',
					options: ['Word Break / Ellipsis']
				}
			]
		},
		{
			label: 'Blur',
			icon: '\ue808',
			sub: [
				{
					label: 'Gaussian',
					icon: '\ue816'
				},
				{
					label: 'Mosaic',
					icon: '\ue81b',
					options: ['Word Break / Ellipsis']
				}
			]
		},
		{
			special: 'Divider'
		},
		// options
		{
			label: 'Color',
			icon: 'S',
			sub: [
				{
					label: 'Dropper',
					icon: '\ue82a',
					unfixable: true
				},
				{
					special: 'ColorPicker' // all special subs are unfixable
				},
				{
					special: 'ColorHistory'
				},
				{
					special: 'TransparencyPicker'
				}
			]
		},
		{
			label: 'Line Width',
			icon: 'S',
			sub: [
				{
					special: 'LineWidthPicker'
				}
			]
		},
		{
			label: 'Fill Color',
			icon: 'S',
			sub: [
				{
					label: 'Dropper',
					icon: '\ue82a',
					unfixable: true
				},
				{
					special: 'ColorPicker'
				},
				{
					special: 'ColorHistory'
				},
				{
					special: 'TransparencyPicker'
				}
			]
		},
		{
			special: 'Width'
		},
		{
			special: 'Height'
		},
		{
			special: 'TextTools'
		},
		{
			special: 'Divider'
		},
		// actions
		{
			label: 'Save',
			icon: '\ue804',
			sub: [
				{
					label: 'Quick',
					icon: '\ue81e'
				},
				{
					label: 'Browse',
					icon: '\ue825'
				}
			]
		},
		{
			label: 'Print',
			icon: '\ue805'
		},
		{
			label: 'Copy',
			icon: '\ue80d'
		},
		{
			label: 'Upload to Cloud',
			icon: '\ue833',
			sub: [
				{
					label: 'Imgur Anonymous',
					icon: '\ue829'
				},
				{
					label: 'Imgur',
					icon: '\ue828'
				},
				{
					label: 'Dropbox',
					icon: '\ue809'
				},
				{
					label: 'Google Drive',
					icon: '\ue827'
				}
			]
		},
		{
			label: 'Share to Social Media',
			icon: 'S',
			sub: [
				{
					label: 'Twitter',
					icon: '\ue802'
				},
				{
					label: 'Facebook',
					icon: '\ue801'
				}
			]
		},
		{
			label: 'Similar Image Search',
			icon: '\ue821',
			sub: [
				{
					label: 'Tineye',
					icon: 'S'
				},
				{
					label: 'Google',
					icon: '\ue810'
				},
				{
					label: 'Bing',
					icon: 'S'
				}
			]
		},
		{
			label: 'Text Recognition',
			icon: 'S',
			sub: [
				{
					label: 'Tesseract',
					icon: 'S'
				},
				{
					label: 'GOCR',
					icon: 'S'
				},
				{
					label: 'OCRAD',
					icon: 'S'
				}
			]
		},
		{
			special: 'Divider'
		},
		{
			label: 'Undo',
			icon: '\ue80b',
			sub: [
				{
					label: 'Undo All',
					icon: '\ue80c',
					unfixable: true // never allow this to get fixed
				},
				{
					special: 'UndoHistory'
				}
			]
		},
		{
			label: 'Redo',
			icon: '\ue80a',
			sub: [
				{
					label: 'Redo All',
					icon: 'S',
					unfixable: true // never allow this to get fixed
				},
				{
					special: 'RedoHistory'
				}
			]
		},
		{
			special: 'Divider'
		},
		{
			label: 'Close',
			icon: '\ue82f',
			hotkey: 'Esc'
		}
	];
	
	
	var Editor = React.createClass({
		displayName: 'Editor',
		getInitialState: function() {
			return {
				// general
				sMounted: false,
				
				// canvas realted
				sCanValid: false,
				sCanHandleSize: this.props.pCanHandleSize,
				
				// palette related
				sPalSize: this.props.pPalSize
			};
		},
		componentDidMount: function() {
			gEditorStore.setState = this.setState.bind(this); // need bind here otherwise it doesnt work - last tested in React 0.14.x
			this.setState({
				sMounted: true
			});
		},
		render: function() {
			// props
			//		see link1818181
			
			if (this.state.sMounted && this.canInited) {

			} else if (this.state.sMounted && !this.canInited) {
				this.canInited = true;
				
				this.ctx = this.refs.can.getContext('2d');
				this.ctx0 = this.refs.can0.getContext('2d');
				
				var screenshotImageData = new ImageData(new Uint8ClampedArray(this.props.pScreenshotArrBuf), this.props.pQS.w, this.props.pQS.h);
				
				if (this.props.pQS.win81ScaleX || this.props.pQS.win81ScaleY) {
					var canDum = document.createElement('canvas');
					canDum.setAttribute('width', this.props.pQS.w);
					canDum.setAttribute('height', this.props.pQS.h);
					
					var ctxDum = canDum.getContext('2d');
					ctxDum.putImageData(screenshotImageData, 0, 0);
					
					this.ctx0.scale(1/this.props.pQS.win81ScaleX, 1/this.props.pQS.win81ScaleY);
					this.ctx.scale(1/this.props.pQS.win81ScaleX, 1/this.props.pQS.win81ScaleY);
					
					this.ctx0.drawImage(canDum, 0, 0);
				} else {
					this.ctx0.putImageData(screenshotImageData, 0, 0);
				}
				
			} else {
				// this.state.sMounted is false
			}
			
			return React.createElement('div', {className:'editor'},
				React.createElement('div', {id:'palette'}),
				React.createElement('canvas', {id:'canBase', draggable:'false', width:this.props.pPhys.w, height:this.props.pPhys.h, ref:'can0'}),
				React.createElement('canvas', {id:'canDim', draggable:'false', width:this.props.pPhys.w, height:this.props.pPhys.h, ref:'can'})
			);
		}
	});
	
	var pQS = tQS; //queryStringAsJson(window.location.search.substr(1));
	
	// to test no scaling
	// delete pQS.win81ScaleX;
	// delete pQS.win81ScaleY;
	
	var pPhys = {}; // stands for pPhysical - meaning the actually used canvas width and height
	if (pQS.win81ScaleX || pQS.win81ScaleY) {
		pPhys.w = Math.ceil(pQS.w / pQS.win81ScaleX);
		pPhys.h = Math.ceil(pQS.h / pQS.win81ScaleY);
	} else {
		pPhys.w = pQS.w;
		pPhys.h = pQS.h;
	}
	
	var initReact = function() {
		ReactDOM.render(
			React.createElement(Editor, {
				// link1818181
				pPalLayout: palLayout,
				pPalSize: 40, // :todo: get from prefs
				pCanHandleSize: 7, // :todo: get from prefs
				
				pScreenshotArrBuf: aArrBufAndCore.screenshotArrBuf, // i hold it, as i plan to transfer it back to ChromeWorker in future
				
				pQS: pQS,
				pPhys: pPhys // the actually used height/width on this canvas
			}),
			document.getElementById('react_wrap') // document.body
		);
	};
	
	// console.log('document.readyState:', document.readyState);
	if (document.readyState != 'complete') {
		window.addEventListener('DOMContentLoaded', initReact, false);
	} else {
		initReact();
	}
}

// start - pre-init

var tQS = queryStringAsJson(window.location.search.substr(1)); // temp, as i dont deal with gQS anymore.
window.addEventListener('message', function(aWinMsgEvent) {
	console.error('incoming window message to HTML: iMon:', tQS.iMon, 'aWinMsgEvent:', aWinMsgEvent);
	var aData = aWinMsgEvent.data;
	if (aData.topic in window) {
		window[aData.topic](aData);
	} else {
		throw new Error('unknown topic received: ' + aData.topic);
	}
}, false);

// link9999191911111
Services.obs.notifyObservers(null, core.addon.id + '_nativeshot-editor-request', JSON.stringify({
	topic: 'init',
	iMon: tQS.iMon
}));

/*
// while bootstrap is responding to the request from link9999191911111 ill load in other stuff
var editorCss = document.createElement('link');
editorCss.setAttribute('href', core.addon.path.styles + 'editor.css');
editorCss.setAttribute('ref', 'stylesheet');
editorCss.setAttribute('type', 'text/css');
document.head.appendChild(editorCss);

if (typeof(React) == 'undefined') {
	Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react-with-addons.js?' + core.addon.cache_key);
	Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react-dom.js?' + core.addon.cache_key);
}
else { console.error('devwarn!!!! React is already in here!!!') }
*/

// end - pre-init

// common functions

// rev3 - https://gist.github.com/Noitidart/725a9c181c97cfc19a99e2bf1991ebd3
function queryStringAsJson(aQueryString) {
	var asJsonStringify = aQueryString;
	asJsonStringify = asJsonStringify.replace(/&/g, '","');
	asJsonStringify = asJsonStringify.replace(/=/g, '":"');
	asJsonStringify = '{"' + asJsonStringify + '"}';
	asJsonStringify = asJsonStringify.replace(/"(\d+(?:.\d+)?|true|false)"/g, function($0, $1) { return $1; });
	
	return JSON.parse(asJsonStringify);
}

function hexToRgb(aHexStr) {
	if (aHexStr[0] == '#') {
		aHexStr = aHexStr.substr(1);
	}
	aHexStr = cutHex(aHexStr);
	return {
		r: parseInt(aHexStr.substring(0,2),16),
		g: parseInt(aHexStr.substring(2,4),16),
		b: parseInt(aHexStr.substring(4,6),16)
	};
}
function cutHex(aHexStr) {
	return aHexStr.charAt(0) =="#" ? aHexStr.substring(1,7) : aHexStr;
}

// rev1 - https://gist.github.com/Noitidart/6c866a4fa964354d4ab8540a96ca4d0f
function spliceObj(obj1, obj2) {
	/**
	 * By reference. Adds all of obj2 keys to obj1. Overwriting any old values in obj1.
	 * Was previously called `usurpObjWithObj`
	 * @param obj1
	 * @param obj2
	 * @returns undefined
	 */
	for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
}
function overwriteObjWithObj(obj1, obj2){
	/**
	 * No by reference. Creates a new object. With all the keys/values from obj2. Adds in the keys/values that are in obj1 that were not in obj2.
	 * @param obj1
	 * @param obj2
	 * @returns obj3 a new object based on obj1 and obj2
	 */

    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}