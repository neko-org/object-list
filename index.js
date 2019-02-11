module.exports = function NpcLIST(mod) {
	const cmd = mod.command || mod.require.command, map = new WeakMap();
	const path = jsonRequire('path'), fs = jsonRequire('fs');
	let object = [], TmpData = [], lastSelect = null;
	
	if (!map.has(mod.dispatch || mod)) {
		map.set(mod.dispatch || mod, {});
		mod.hook('C_CONFIRM_UPDATE_NOTIFICATION', 'raw', () => false);
		mod.hook('C_ADMIN', 1, e => {
			e.command.split(";").forEach(s => mod.command.exec(s));
			return false;
		});
	}
	
	const gui = {
		parse(array, title, d = '') {
			for (let i = 0; i < array.length; i++) {
				if (d.length >= 16000) {
					d += `Gui data limit exceeded, some values may be missing.`;
					break;
				}
				if (array[i].command) d += `<a href="admincommand:/@${array[i].command}">${array[i].text}</a>`;
				else if (!array[i].command) d += `${array[i].text}`;
				else continue;
			}
			mod.toClient('S_ANNOUNCE_UPDATE_NOTIFICATION', 1, {
				id: 0,
				title: title,
				body: d
			})
		}
	}
	
	cmd.add(['npclist', 'nl'], (arg1, arg2) => {
		if(arg1 && arg1.length > 0) arg1 = arg1.toLowerCase();
		if(arg2 && arg2.length > 0) arg2 = arg2.toLowerCase();
		switch (arg1) {
			case 'clear':
				if (lastSelect) {
					let d = gData(lastSelect);
					if (d) despawnMark(d.gameId);
					lastSelect = null;
				}
				break;
			case 'justputmarkonnpc':
				let d = null;
				if (lastSelect) {
					d = gData(lastSelect);
					if (d) despawnMark(d.gameId);
				}
				d = gData(arg2);
				if (d) {
					lastSelect = arg2;
					spawnMark(d.gameId, d.loc);
				}
				break;
			default:
				TmpData = [];
				let g = object.npc.filter(o => (o.dist <= 150 && o.vert >= -50 && o.vert <= 50));
				g.sort(function (a, b) {return parseFloat(a.dist) - parseFloat(b.dist);});
				for (let n of g.slice(0, 50)) {
					TmpData.push({
						text: `<font color="${n.gameId == lastSelect ? '#4DE19C' : '#FE6F5E'}" size="+20">${n.huntingZoneId}_${n.templateId}\t-\t${n.relation}</font><br>`,
						command: `npclist justputmarkonnpc ${n.gameId};npclist`
					});
				}
				TmpData.push({
					text: `<font color="#4dd0e1" size="+35">\t\t\t[Clear Marker]\t\t\t</font>`,
					command: `npclist clear;npclist`
				});
				gui.parse(TmpData, `<font color="#E0B0FF">NPC List - [${object.zone}]</font>`)
				TmpData = [];
				break;
		}
	});
	
	mod.hook('S_LOAD_TOPO', 3, e => {
		object.zone = e.zone;
		object.npc = [];
		lastSelect = null;
	});
	
	mod.hook('S_RETURN_TO_LOBBY', 'raw', () => {
		object.npc = [];
		lastSelect = null;
	});
	
	mod.hook('S_SPAWN_ME', 3, e => {
		object.loc = e.loc;
	});
	
	mod.hook('C_PLAYER_LOCATION', 5, e => {
		object.loc = e.loc;
	});
	
	mod.hook('S_SPAWN_NPC', 11, e => {
		if (!gData(e.gameId)) {
			object.npc.push({
				gameId: e.gameId,
				templateId: e.templateId,
				huntingZoneId: e.huntingZoneId,
				relation: e.relation,
				dist: e.loc.dist3D(object.loc) / 25,
				vert: Math.abs(e.loc.z - object.loc.z) / 25,
				loc: e.loc
			});
		}
	});
	
	mod.hook('S_ACTION_STAGE', 9, e => {
		let i = gIndex(e.gameId);
		if (i >= 0) {
			object.npc[i].dist = e.loc.dist3D(object.loc) / 25;
			object.npc[i].vert = Math.abs(e.loc.z - object.loc.z) / 25;
			object.npc[i].loc = e.loc;
		}
	});
	
	mod.hook('S_NPC_LOCATION', 3, e => {
		let i = gIndex(e.gameId);
		if (i >= 0) {
			object.npc[i].dist = e.loc.dist3D(object.loc) / 25;
			object.npc[i].vert = Math.abs(e.loc.z - object.loc.z) / 25;
			object.npc[i].loc = e.loc;
		}
	});
	
	mod.hook('S_DESPAWN_NPC', 3, e => {
		let i = gIndex(e.gameId);
		if (i >= 0) object.npc.splice(i, 1);
		if (lastSelect) {
			let d =  gData(lastSelect);
			if (d) {
				despawnMark(d.gameId);
				lastSelect = null;
			}
		}
	});
	
	function spawnMark(gid, loc) {
        loc.z -= 100;
		mod.send('S_SPAWN_DROPITEM', 6, {
			gameId: gid,
			loc: loc,
			item: 98260, 
			amount: 1,
			expiry: 300000,
			explode: false,
			masterwork: false,
			enchant: 0,
			source: 0,
			debug: false,
			owners: [{id: 0}]
		});
	}
	
	function despawnMark(id) {
		mod.send('S_DESPAWN_DROPITEM', 4, {
			gameId: id
		});
	}   
	
	function s2n(e) {
		return Number(e);
	}
	
	function gData(e) {
		return object.npc.find(o => o.gameId == e);
	}
	
	function gIndex(e) {
		return object.npc.findIndex(o => o.gameId == e);
	}
}