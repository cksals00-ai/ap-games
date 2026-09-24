// reveal on scroll · hero video fallback
(function(){
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -10% 0px'});
  document.querySelectorAll('.hcard,.tcard,.tmini,.arenas li,.ngrid article,.skills li').forEach(function(el){el.classList.add('rv');io.observe(el)});
  var v=document.querySelector('.hero .bg');if(v){v.play&&v.play().catch(function(){})}
})();
