/**
 * Perfect Ostrove Blossom Worker.
 * Alex Striff.
 */

/**
 * TODO: Move permutation into a worker and show progress in main thread. Too
 * much effort for now; the user will just have to wait a minute or so at the
 * beginning for large permutations.
 */

var perm_worker = function()  {
	self.importScripts("math.js");

	onmessage   = function(e) {
		var d = e.data;

		console.log("Worker recieved a message.");
		console.log(d);
		console.log(d.toString());

		// for (var i = 0; i < d.length) {
			// d[i] = d[i].map(function(sym) {
			// 	return operators[symbols.indexOf(sym)];
			// });
		// }

		d = d.map(function(permset) {
			permset = permset.map(function(sym) {
				return operators[symbols.indexOf(sym)];
			});
		});

		console.log("Computing permutations...");
		var perms = perm_funcs(e.data[0]);
		console.log("... Done.");
		console.log("Computed ", perms.length, " permutations.");
		console.log("Posting back to main script.");
		postMessage(perms);
	};

	onerror     = function(e) {
		console.log("Worker encountered an error: ", e);
	};
};

if (window !== self) {
	perm_worker();
}

