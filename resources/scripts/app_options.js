function initAppPage(aArg) {
	// aArg is what is received by the call in `init`
	// filter hydrant to just prefs i care about

	gBlockDetails = {
		autoupdate: {
			type: 'buttons',
			options: createSortedOnOffOptionsArr(2, 0)
		},
		quick_save_dir: {
			type: 'action',
			actions: [
				{
					onClick: function() {
						callInBootstrap(
							'browseFile',
							{
								aDialogTitle: formatStringFromNameCore('filepicker_title_changequicksavedir', 'main'),
								aOptions: {
									mode: 'modeGetFolder',
									win: 'navigator:browser'
								}
							},
							function(aArg) {
								if (aArg) {
									store.dispatch(setPref('quick_save_dir', aArg));
								}
							}
						);
					},
					label: formatStringFromNameCore('change', 'main')
				}
			]
		},
		print_preview: {
			type: 'buttons',
			options: createSortedOnOffOptionsArr(true, false)
		},
		system_hotkey: {
			type: 'buttons',
			options: createSortedOnOffOptionsArr(true, false)
		},
		default_tesseract_lang: {
			type: 'dropdown',
			options: createSortedTessLangArr()
		}
	};

	gAppPageComponents = [];

	// push rows
	var crow = [React.createElement(BlockContainer, { special:'autoupdate' })];
	const MAX_BLOCKS_PER_ROW = 3;
	for (var a_pref in hydrant_ex.prefs) {
		crow.push(React.createElement(BlockContainer, { pref:a_pref }));

		if (crow.length == MAX_BLOCKS_PER_ROW) {
			gAppPageComponents.push(React.createElement(Row, undefined,
				crow
			));
			crow = [];
		}
	}
	if (crow.length) {
		gAppPageComponents.push(React.createElement(Row, undefined,
			crow
		));
	}
}

function uninitAppPage() {

}

function focusAppPage() {
	console.error('focused!!!!!!');
	callInMainworker('fetchCore', { nocore:true, hydrant_ex_instructions }, function(aArg) {
		var differents; // key is mainkey
		for (var p in aArg.hydrant_ex) {
			var is_different = React.addons.shallowCompare({props:hydrant_ex[p]}, aArg.hydrant_ex[p]);
			console.error('hydrant_ex.' + p + ' is_different:', is_different);
			if (is_different) {
				if (!differents) {
					differents = {};
				}
				differents[p] = aArg.hydrant_ex[p];
			}
		}

		if (differents) {
			store.dispatch(setMainKeys(differents));
		}
	});
}

function createSortedOnOffOptionsArr(aOnVal, aOffVal) {
	var arr = [
		{
			label: formatStringFromNameCore('on', 'main'),
			value: aOnVal
		},
		{
			label: formatStringFromNameCore('off', 'main'),
			value: aOffVal
		}
	];
	arr.sort((a, b) => a.label > b.label);

	return arr;
}

function createSortedTessLangArr() {
	var arr = [
		{ value:'eng', label: formatStringFromNameCore('eng', 'main') },
		{ value:'chi_sim', label: formatStringFromNameCore('chi_sim', 'main') },
		{ value:'rus', label: formatStringFromNameCore('rus', 'main') },
		{ value:'meme', label: formatStringFromNameCore('meme', 'main') },
		{ value:'tha', label: formatStringFromNameCore('tha', 'main') },
		{ value:'deu', label: formatStringFromNameCore('deu', 'main') },
		{ value:'jpn', label: formatStringFromNameCore('jpn', 'main') },
		{ value:'spa', label: formatStringFromNameCore('spa', 'main') },
		{ value:'fra', label: formatStringFromNameCore('fra', 'main') },
		{ value:'chi_tra', label: formatStringFromNameCore('chi_tra', 'main') },
		{ value:'por', label: formatStringFromNameCore('por', 'main') },
		{ value:'ita', label: formatStringFromNameCore('ita', 'main') },
		{ value:'pol', label: formatStringFromNameCore('pol', 'main') },
		{ value:'tur', label: formatStringFromNameCore('tur', 'main') },
		{ value:'nld', label: formatStringFromNameCore('nld', 'main') },
		{ value:'ara', label: formatStringFromNameCore('ara', 'main') },
		{ value:'ces', label: formatStringFromNameCore('ces', 'main') },
		{ value:'kor', label: formatStringFromNameCore('kor', 'main') },
		{ value:'swe', label: formatStringFromNameCore('swe', 'main') },
		{ value:'vie', label: formatStringFromNameCore('vie', 'main') },
		{ value:'ron', label: formatStringFromNameCore('ron', 'main') },
		{ value:'ell', label: formatStringFromNameCore('ell', 'main') },
		{ value:'ind', label: formatStringFromNameCore('ind', 'main') },
		{ value:'hun', label: formatStringFromNameCore('hun', 'main') },
		{ value:'dan', label: formatStringFromNameCore('dan', 'main') },
		{ value:'bul', label: formatStringFromNameCore('bul', 'main') },
		{ value:'fin', label: formatStringFromNameCore('fin', 'main') },
		{ value:'nor', label: formatStringFromNameCore('nor', 'main') },
		{ value:'ukr', label: formatStringFromNameCore('ukr', 'main') },
		{ value:'cat', label: formatStringFromNameCore('cat', 'main') },
		{ value:'hrv', label: formatStringFromNameCore('hrv', 'main') },
		{ value:'heb', label: formatStringFromNameCore('heb', 'main') },
		{ value:'lit', label: formatStringFromNameCore('lit', 'main') },
		{ value:'slv', label: formatStringFromNameCore('slv', 'main') },
		{ value:'hin', label: formatStringFromNameCore('hin', 'main') },
		{ value:'ben', label: formatStringFromNameCore('ben', 'main') },
		{ value:'tel', label: formatStringFromNameCore('tel', 'main') },
		{ value:'tam', label: formatStringFromNameCore('tam', 'main') },
		{ value:'kan', label: formatStringFromNameCore('kan', 'main') },
		{ value:'mal', label: formatStringFromNameCore('mal', 'main') },
		{ value:'tgl', label: formatStringFromNameCore('tgl', 'main') },
		{ value:'swa', label: formatStringFromNameCore('swa', 'main') },
		{ value:'aze', label: formatStringFromNameCore('aze', 'main') },
		{ value:'bel', label: formatStringFromNameCore('bel', 'main') },
		{ value:'afr', label: formatStringFromNameCore('afr', 'main') },
		{ value:'sqi', label: formatStringFromNameCore('sqi', 'main') },
		{ value:'eus', label: formatStringFromNameCore('eus', 'main') },
		{ value:'epo', label: formatStringFromNameCore('epo', 'main') },
		{ value:'est', label: formatStringFromNameCore('est', 'main') },
		{ value:'glg', label: formatStringFromNameCore('glg', 'main') },
		{ value:'isl', label: formatStringFromNameCore('isl', 'main') },
		{ value:'lav', label: formatStringFromNameCore('lav', 'main') },
		{ value:'mkd', label: formatStringFromNameCore('mkd', 'main') },
		{ value:'msa', label: formatStringFromNameCore('msa', 'main') },
		{ value:'mlt', label: formatStringFromNameCore('mlt', 'main') },
		{ value:'grc', label: formatStringFromNameCore('grc', 'main') },
		{ value:'chr', label: formatStringFromNameCore('chr', 'main') },
		{ value:'enm', label: formatStringFromNameCore('enm', 'main') },
		{ value:'epo_alt', label: formatStringFromNameCore('epo_alt', 'main') },
		{ value:'frk', label: formatStringFromNameCore('frk', 'main') },
		{ value:'frm', label: formatStringFromNameCore('frm', 'main') },
		{ value:'ita_old', label: formatStringFromNameCore('ita_old', 'main') },
		{ value:'equ', label: formatStringFromNameCore('equ', 'main') },
		{ value:'srp', label: formatStringFromNameCore('srp', 'main') },
		{ value:'slk', label: formatStringFromNameCore('slk', 'main') },
		{ value:'spa_old', label: formatStringFromNameCore('spa_old', 'main') }
	];

	arr.sort((a, b) => a.label > b.label);

	return arr;
}

var gBlockDetails; // set during init due ot using formatStringFromNameCore
// start - react-redux

// REACT COMPONENTS - PRESENTATIONAL
var Row = React.createClass({
	shouldComponentUpdate: ()=>false,
	render: function() {
		var { children } = this.props;

		return React.createElement('div', { className:'padd-80' },
			React.createElement('div', { className:'row' },
				children
			)
		);
	}
});

var Block = React.createClass({
	displayName: 'Block',
	setPref: function(value) {
		var { pref, special } = this.props;
		if (special) {
			if (special == 'autoupdate') {
				store.dispatch(setAddonInfo('applyBackgroundUpdates', value));
			}
		} else {
			store.dispatch(setPref(pref, value));
		}
	},
	render: function() {
		var { title, type, value, pref, special, value_label, value_label_sup, details } = this.props;
		// type - string enum:buttons, select, action
			// action means on click it does custom, like browse directory

		var controls = [];
		switch (details.type) {
			case 'buttons':
					var options = details.options;
					for (var option of options) {
						if (option.value !== value) {
							controls.push( React.createElement(Button, { key:option.label, style:2, size:'md', text:option.label, onClick:this.setPref.bind(null, option.value) }) );
						}
					}
				break;
			case 'dropdown':
					controls.push( React.createElement(Dropdown, { style:2, size:'md', label:formatStringFromNameCore('change', 'main'), alwaysShowLabel:true, options:details.options, onChange:this.setPref }) );
				break;
			case 'action':
					for (var action of details.actions) {
						controls.push( React.createElement(Button, { style:2, size:'md', text:action.label, onClick:action.onClick }) );
					}
				break;
		}
		pushAlternatingRepeating(controls, ' ');

		return React.createElement('div', { className:'col-lg-4 col-lg-offset-0 col-md-4 col-md-offset-0 col-sm-6 col-sm-offset-3 col-xs-12' },
				React.createElement('div', { className:'pref-block' },
				React.createElement('div', { className:'pref-block-title' },
					React.createElement('h4', {},
						title
					)
				),
				React.createElement('div', { className:'pref-block-value' },
					!value_label_sup ?  undefined : React.createElement('sup', undefined, value_label_sup),
					React.createElement('span', {},
						value_label
					)
				),
				React.createElement('ul', undefined,
					React.createElement('li', undefined,
						'desc1'
					),
					React.createElement('li', undefined,
						'desc2'
					)
				),
				React.createElement('div', { className:'pref-block-btns' },
					controls
				)
			)
		);
	}
});

// REACT COMPONENTS - CONTAINER
var BlockContainer = ReactRedux.connect(
	function mapStateToProps(state, ownProps) {
		// NOTE: so each BlockContainer must be React.createElement(BlockContainer, { pref__OR__special:string })
		if (ownProps.pref) {

			// set value_label - localized if necessary
			var value = state.prefs[ownProps.pref];
			var value_label;
			if (typeof(value) == 'boolean') {
				value_label = formatStringFromNameCore(state.prefs[ownProps.pref] ? 'on' : 'off', 'main');
			} else {
				value_label = value;

				// special
				if (ownProps.pref == 'default_tesseract_lang') {
					value_label = formatStringFromNameCore(value, 'main');
				}
			}

			// special
			var value_label_sup;
			if (ownProps.pref == 'quick_save_dir') {
				var parts = value.match(new RegExp('(.*)' + escapeRegExp(core.os.filesystem_seperator) + '(.*)'));
				console.log('parts:', parts);
				if (parts) {
					value_label_sup = parts[1];
					value_label = parts[2];
				}
				// dont set value_label_sup
			}

			return {
				value_label,
				value,
				value_label_sup,
				title: formatStringFromNameCore(ownProps.pref, 'main'),
				details: gBlockDetails[ownProps.pref],
				pref: ownProps.pref
			};
		} else if (ownProps.special) {

			var value;
			var value_label;
			switch (ownProps.special) {
				case 'autoupdate':
					value = state.addon_info.applyBackgroundUpdates;
					value_label = formatStringFromNameCore(value ? 'on' : 'off', 'main');
			}

			return {
				value,
				value_label,
				title: formatStringFromNameCore(ownProps.special, 'main'),
				details: gBlockDetails[ownProps.special],
				special: ownProps.special
			};
		}
		else { console.error('DEVERROR: must have pref OR special prop'); throw new Error('DEVERROR: must have pref OR special prop'); }
	},
	function mapDispatchToProps(dispatch, ownProps) {
		return {

		};
	}
)(Block);

// material for app.js
var gAppPageNarrow = false;

var gAppPageHeaderProps = {
	type: 3,
	get text() { return formatStringFromNameCore('header_text_dashboard', 'main') },
	menu: [
		{
			 get text() { return formatStringFromNameCore('history', 'main') },
			 href: 'about:nativeshot'
		},
		{
			 get text() { return formatStringFromNameCore('options', 'main') }
		},
		{
			 get text() { return formatStringFromNameCore('authorization', 'main') },
			 href: 'about:nativeshot?auth'
		}
	]
};

var gAppPageComponents; // done in `initAppPage` because it needs localization

// instructions on how to populate hdrant and hydrant_ex. they will be populated as objects. but here i set them as a string for hydrant, and object of instructions for hydrant_ex
var hydrant; // converted into object on `init` in app.js // update this is handled automatically by the `shouldUpdateHydrant` in app_page's
var hydrant_ex = {
	prefs: {},
	addon_info: {}
};

var hydrant_ex_instructions = { // stuff that shouldnt get written to hydrants entry in filestore. updating this is handled manually by dev
	filestore_entries: ['prefs'],
	addon_info: true
};

function shouldUpdateHydrantEx() {
	console.log('in shouldUpdateHydrantEx');

	var state = store.getState();

	// check if hydrant_ex updated
	var hydrant_ex_updated = false;
	for (var p in hydrant_ex) {
		var is_different = React.addons.shallowCompare({props:hydrant_ex[p]}, state[p]);
		if (is_different) {
			console.log('something in', p, 'of hydrant_ex was updated');
			hydrant_ex_updated = true;

			if (!gSupressUpdateHydrantExOnce) {
				// update file stores or whatever store this key in hydrant_ex is connected to
				if (hydrant_ex_instructions.filestore_entries && hydrant_ex_instructions.filestore_entries.includes(p)) {
					callInMainworker('updateFilestoreEntry', {
						mainkey: p,
						value: state[p]
					})
				} else if (p == 'addon_info') {
					// make sure it is just applyBackgroundUpdates, as i only support changing applyBackgroundUpdates
					if (hydrant_ex.addon_info.applyBackgroundUpdates !== state.addon_info.applyBackgroundUpdates) {
						callInBootstrap('setApplyBackgroundUpdates', state.addon_info.applyBackgroundUpdates);
					}
				}
			}
			console.log('compared', p, 'is_different:', is_different, 'state:', state[p], 'hydrant_ex:', hydrant_ex[p]);
			hydrant_ex[p] = state[p];
			// break; // dont break because we want to update the hydrant_ex in this global scope for future comparing in this function.
		}
	}

	if (gSupressUpdateHydrantExOnce) {
		console.log('hydrant_ex update supressed once');
		gSupressUpdateHydrantExOnce = false;
		return;
	}

	console.log('done shouldUpdateHydrantEx');
}

// ACTIONS
const SET_PREF = 'SET_PREF';
const SET_ADDON_INFO = 'SET_ADDON_INFO';
const SET_MAIN_KEYS = 'SET_MAIN_KEYS';

// ACTION CREATORS
function setPref(pref, value) {
	return {
		type: SET_PREF,
		pref,
		value
	}
}
function setAddonInfo(info, value) {
	return {
		type: SET_ADDON_INFO,
		info,
		value
	}
}
function setMainKeys(obj_of_mainkeys) {
	gSupressUpdateHydrantExOnce = true;
	return {
		type: SET_MAIN_KEYS,
		obj_of_mainkeys
	}
}

// REDUCERS
function prefs(state=hydrant_ex.prefs, action) {
	switch (action.type) {
		case SET_PREF:
			var { pref, value } = action;
			return Object.assign({}, state, {
				[pref]: value
			});
		case SET_MAIN_KEYS:
			var { obj_of_mainkeys } = action;
			var mainkey = 'prefs';
			return (mainkey in obj_of_mainkeys ? obj_of_mainkeys[mainkey] : state);
		default:
			return state;
	}
}
function addon_info(state=hydrant_ex.addon_info, action) {
	switch (action.type) {
		case SET_ADDON_INFO:
			var { info, value } = action;
			return Object.assign({}, state, {
				[info]: value
			});
		case SET_MAIN_KEYS:
			var { obj_of_mainkeys } = action;
			var mainkey = 'addon_info';
			return (mainkey in obj_of_mainkeys ? obj_of_mainkeys[mainkey] : state);
		default:
			return state;
	}
}

// `var` so app.js can access it
var app = Redux.combineReducers({
	prefs,
	addon_info
});

// end - react-redux
