// ?theme=dark|light wins, then localStorage (same key as the app), then system.
(function(){var p=new URLSearchParams(location.search).get('theme');var s=null;try{s=localStorage.getItem('visualizer-theme')}catch(e){}
var t=p||s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark')})();
