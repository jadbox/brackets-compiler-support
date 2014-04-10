/** 
(c) by Victor Hornets
Allow to run build programs (such as running Python/Ruby/Node/etc scripts) from Brackets and display results in panel. It is possible to create own build systems via 'Edit>Edit Builder' menu item and editing opened JSON-file (you need to restart Brackets).
**/

/*jslint plusplus: true, vars: true, nomen: true */
/*global define, brackets, console, setTimeout */

define(function (require, exports, module) {
    "use strict";

    var CommandManager		= brackets.getModule("command/CommandManager"),
        Menus				= brackets.getModule("command/Menus"),
        NodeConnection		= brackets.getModule("utils/NodeConnection"),
        ExtensionUtils		= brackets.getModule("utils/ExtensionUtils"),
		DocumentManager		= brackets.getModule("document/DocumentManager"),
        KeyBindingManager	= brackets.getModule('command/KeyBindingManager'),
        FileUtils			= brackets.getModule("file/FileUtils"),
        PanelManager        = brackets.getModule("view/PanelManager"),
		Dialogs				= brackets.getModule("widgets/Dialogs"),
        nodeConnection		= new NodeConnection(),
        domainPath			= ExtensionUtils.getModulePath(module) + "domain";
	
	var curOpenDir,
		curOpenFile,
		curOpenLang,
		cmd = '';
	
	var builders = JSON.parse(require('text!builder.json')),
		panel,
		panelHTML = require('text!brackets-builder-panel.html'),
		panelIsVisible = false;
	
	function _processCmdOutput(data) {
		data = JSON.stringify(data);
		data = data.replace(/\\n/g, '<br />').replace(/\"/g, '').replace(/\\t/g, '');
		
		return panelHTML.replace("{{content}}", data);
	}
	
	function _processPanel(curPanel) {
		
		$('.builder-panel:last').prev(".builder-panel").remove();
		curPanel.show();
		
		$('.builder-panel .close').on('click', function () {
			curPanel.hide();
		});
	}
	
	function handle() {
		curOpenDir	= DocumentManager.getCurrentDocument().file._parentPath;
		curOpenFile	= DocumentManager.getCurrentDocument().file._path;
		curOpenLang	= DocumentManager.getCurrentDocument().language._name;
		
		nodeConnection.connect(true).fail(function (err) {
			console.error("[[Brackets Builder]] Cannot connect to node: ", err);
		}).then(function () {
			console.log('Building ' + curOpenLang + ' in ' + curOpenFile + '...\n');
			
			return nodeConnection.loadDomains([domainPath], true).fail(function (err) {
				console.error("[[Brackets Builder]] Cannot register domain: ", err);
			});
		}).then(function () {
			builders.forEach(function (el) {
				if (el.name.toLowerCase() === curOpenLang.toLowerCase()) {
					cmd = el.cmd;
				}
			});
			
			cmd = cmd.replace("$FILE", curOpenFile);
		}).then(function () {
			nodeConnection.domains["builder.execute"].exec(curOpenDir, cmd)
			.fail(function (err) {
				panel = PanelManager.createBottomPanel("brackets-builder-panel", $(_processCmdOutput(err)));
				_processPanel(panel);
			})
			.then(function (data) {
				panel = PanelManager.createBottomPanel("brackets-builder-panel", $(_processCmdOutput(data)));
				_processPanel(panel);
			});
		}).done();
	}
		
	CommandManager.register('Handling Build', 'builder.build', handle);

	KeyBindingManager.addBinding('builder.build', 'Ctrl-B');
	
	
	
	// Add menu item to edit .json file
    var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    
    menu.addMenuDivider();
    // Create menu item that opens the config .json-file    
    CommandManager.register("Edit Builder", 'builder.open-conf', function () {
		Dialogs.showModalDialog('', 'Brackets Builder Extention', 'You must restar Brackets after changing this file.');
        var src = FileUtils.getNativeModuleDirectoryPath(module) + "/builder.json";
        
        DocumentManager.getDocumentForPath(src).done(
            function (doc) {
                DocumentManager.setCurrentDocument(doc);
            }
        );
    });
    
    menu.addMenuItem('builder.open-conf');
	
	// Load panel css
    ExtensionUtils.loadStyleSheet(module, "brackets-builder.css");
});
