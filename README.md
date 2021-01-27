# Weasel Integration

1) Embed weasel snippet in your html code at the top of the page.
```js
<script>
    (function(c,e,f,k,g,h,b,a,d){c['defaultVars.nameOfLongGlobal']||(c[g]=h,b=c[h]=function(){
    b.q.push(arguments)},b.q=[],b.l=1*new Date,a=e.createElement(f),a.async=1,
    a.src=k,d=e.getElementsByTagName(f)[0],
    d.parentNode.insertBefore(a,d))})(window,document,"script",
    "http://169.53.56.203:30001/eum.js", "EumObject", "ineum");
    ineum('reportingUrl', 'http://169.53.56.203:30001/report');
</script>
```

2) http://169.53.56.203:30001/eum.js needs to point to the js file so it can be downloaded when the html page is ran.
You can copy the js file(weasel) from [here](https://github.ibm.com/Jordan-Williams1/weasel-flask/tree/master/static/eum.js) 
and serve them using a simple http-server from your side if you prefer.

3) The reportingUrl is defined in [eum.js](https://github.ibm.com/Jordan-Williams1/weasel-flask/tree/master/static/eum.js) 
and can also be defined in the above snippet. If it is not defined in the above snippet, it defaults to the definition in 
[eum.js](https://github.ibm.com/Jordan-Williams1/weasel-flask/tree/master/static/eum.js).