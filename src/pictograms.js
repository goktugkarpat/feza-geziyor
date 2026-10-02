/* Büyük, yazı okumadan anlaşılabilen oyun düğmeleri. */
'use strict';
window.FLASH_PICTO=(()=>{
  const paths={
    play:'<path d="M20 13L47 32 20 51Z" fill="currentColor" stroke="none"/>',
    bolt:'<path d="M37 5L13 36h18l-5 23 25-34H33Z" fill="currentColor" stroke="none"/>',
    globe:'<circle cx="32" cy="32" r="24"/><ellipse cx="32" cy="32" rx="11" ry="24"/><path d="M9 24h46M9 40h46M32 8v48"/>',
    book:'<path d="M32 16Q19 7 7 13v39q13-5 25 3 12-8 25-3V13q-12-6-25 3v39"/><path d="M16 24h8m-8 9h8m16-9h8m-8 9h8"/>',
    camera:'<path d="M7 22h12l5-9h16l5 9h12v31H7Z"/><circle cx="32" cy="36" r="11"/><path d="M49 28h2"/>',
    sound:'<path d="M8 25h11l14-12v38L19 39H8Z" fill="currentColor" stroke="none"/><path d="M41 23q12 9 0 18m7-26q21 17 0 34"/>',
    foot:'<ellipse cx="23" cy="23" rx="9" ry="16" transform="rotate(25 23 23)"/><ellipse cx="42" cy="43" rx="8" ry="14" transform="rotate(-20 42 43)"/>',
    arrow:'<path d="M9 32h43M36 15l17 17-17 17"/>',
    back:'<path d="M55 32H12M28 15L11 32l17 17"/>',
    star:'<path d="M32 6l8 17 19 3-14 14 3 19-16-9-17 9 4-19L5 26l19-3Z"/>',
    check:'<path d="M13 32l12 12 27-28"/>',
    close:'<path d="M16 16l32 32M48 16L16 48"/>',
    gear:'<path d="M25 7h14l2 8 8 4 8-2 7 12-6 6v9l6 6-7 12-8-2-8 4-2 8H25l-2-8-8-4-8 2-7-12 6-6v-9l-6-6 7-12 8 2 8-4Z" transform="translate(5 0) scale(.84)"/><circle cx="32" cy="32" r="9"/>',
    touch:'<path d="M26 35V14q0-9 8-6v22l6-4 5 4 5-1 6 8-5 20H29L13 40q-4-8 4-8Z"/><path d="M13 14l-5 4m7 4H7m9-19-4-5"/>',
    wave:'<path d="M5 24q9-13 18 0t18 0 18 0M5 39q9-13 18 0t18 0 18 0M5 54q9-13 18 0t18 0 18 0"/>',
    trees:'<path d="M19 6L5 31h9L4 46h30L24 31h9ZM20 46v13M45 17L34 39h7l-8 13h25l-8-13h7ZM46 52v7"/>',
    mountain:'<path d="M5 54L26 13l15 25 7-13 13 29ZM17 31l9-18 11 18-8-3-5 5Z"/>',
    plus:'<path d="M32 13v38M13 32h38"/>',
    minus:'<path d="M13 32h38"/>',
    ring:'<circle cx="32" cy="32" r="21"/><circle cx="32" cy="32" r="13"/>',
    flowers:'<path d="M32 35v24M32 48q-16-17-22-7 7 12 22 7M32 53q15-18 22-8-6 12-22 8"/><path d="M32 8c10-9 17 1 11 9 13-1 16 11 5 15 6 10-4 18-12 11-4 12-17 10-17-2-12 3-18-9-9-16-7-9 4-19 12-11-1-11 9-15 10-6Z"/><circle cx="31" cy="27" r="7" fill="currentColor" stroke="none"/>',
    windmills:'<path d="M29 32l-7 27h20l-7-27M31 25L12 10l-3 14 22 4M34 25l14-19 9 11-20 12M36 31l19 14-11 9-13-21M29 31L14 50 5 39l22-12"/><circle cx="32" cy="28" r="5" fill="currentColor"/>',
    splash:'<path d="M32 7Q18 25 18 35a14 14 0 0 0 28 0Q46 25 32 7Z"/><path d="M6 52q9-9 17 0t17 0 18 0M9 35l-4-7m49 7 5-7M24 34q-2 8 5 10"/>',
    kite:'<path d="M32 5L52 25 32 46 12 25ZM32 5v41M12 25h40M32 46q16 5 4 12"/><path d="M36 51l6-1-1 7-7-3Z" fill="currentColor"/>',
    ball:'<circle cx="32" cy="32" r="24"/><path d="M32 18l13 10-5 15H24l-5-15ZM32 8v10M55 24l-10 4M47 51l-7-8M17 51l7-8M9 24l10 4"/>',
    butterfly:'<path d="M30 30C8-2-1 16 10 32 0 53 16 60 30 37M34 30C56-2 65 16 54 32c10 21-6 28-20 5M32 26v22M31 27l-7-12m9 12 7-12"/><circle cx="32" cy="29" r="4" fill="currentColor"/>'
  };
  function svg(name){return '<svg class="picto" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.star)+'</svg>';}
  function node(name){const span=document.createElement('span');span.className='pictogram';span.innerHTML=svg(name);return span;}
  function stars(count,total=3){const row=document.createElement('span');row.className='picture-stars';for(let i=0;i<total;i++){const s=node('star');s.classList.toggle('earned',i<count);row.append(s);}return row;}
  return {svg,node,stars};
})();
