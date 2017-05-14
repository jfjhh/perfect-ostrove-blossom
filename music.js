/**
 * Perfect Ostrove Blossom Music.
 * Alex Striff.
 */

"use strict";

var Music = (function()
{

var songdir = "../bgm"; /* Place `bgm` in the same parent directory as POB. */
var songs   = [
	"1.mp3",
	"2.mp3",
	"3.mp3",
	"4.mp3",
	"5.mp3",
	"6.mp3",
	"7.mp3",
	"8.mp3",
	"9.mp3",
	"10.mp3",
	"11.mp3",
	"12.mp3",
	"13.mp3",
	"14.mp3",
	"15.mp3",
	"16.mp3",
	"17.mp3",
	"18.mp3",
	"19.mp3",
	"20.mp3",
];

var song_names = [
	"Mystic Dream &#x301C; Snow or Cherry Petal",
	"Paradise &#x301C; Deep Mountain",
	"Crystallized Silver",
	"The Fantastic Tales from Tono",
	"Withered Leaf",
	"The Doll Maker of Bucuresti",
	"Doll Judgment &#x301C; The Girl who Played with People's Shapes",
	"The Capital City of Flowers in the Sky",
	"Ghostly Band &#x301C; Phantom Ensemble",
	"Eastern Mystical Dream &#x301C; Ancient Temple",
	"Hiroari Shoots a Strange Bird &#x301C; Till When?",
	"Ultimate Truth",
	"Bloom Nobly, Ink-Black Cherry Blossom &#x301C; Border of Life",
	"Border of Life",
	"Youkai Domination",
	"A Maiden's Illusionary Funeral &#x301C; Necro-Fantasy",
	"Youkai Domination &#x301C; Who done it!",
	"Necrofantasia",
	"Dream of a Spring Breeze",
	"Sakura, Sakura &#x301C; Japanize Dream...",
];

var playing  = false;
var audios   = [];
var cur_song = Math.floor(Math.random() * songs.length);

// function next_song(inc)
var next_song = function(inc)
{
	var inc = inc || false;

	if (!inc) {
		cur_song++;
	}

	if (cur_song >= songs.length) {
		cur_song = 0;
	}

	Music.song_info.innerHTML = song_names[cur_song];
	audios[cur_song].play();
}

// function toggle()
var toggle = function()
{
	var a   = audios[cur_song];
	var p   = playing;
	playing = !playing;
	if (p) {
		a.pause();
	} else {
		next_song(true);
	}
	return false;
}

// function toggle_next()
var toggle_next = function()
{
	var a = audios[cur_song];
	a.pause();
	a.currentTime = 0;

	playing = true;
	next_song();

	return false;
}

for (var i = 0; i < songs.length; i++) {
	var a = new Audio(songdir + "/" + songs[i]);
	a.load();
	a.id = i;
	a.onended = function(){
		next_song();
	};
	audios[i] = a;
}

// var song_info = document.getElementById("song");
// song_info.onclick       = toggle;
// song_info.oncontextmenu = toggle_next;

return {
	toggle      : toggle,
	toggle_next : toggle_next,
	song_info   : document.getElementById("song"),
};

})();

Music.song_info.onclick       = Music.toggle;
Music.song_info.oncontextmenu = Music.toggle_next;

