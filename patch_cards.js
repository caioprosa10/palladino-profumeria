const fs = require('fs');
let css = fs.readFileSync('src/app/globals.css', 'utf8');

css = css.replace(
`.card-img-wrapper {
    position: relative;
    width: 100%;
    padding-top: 133%;
    overflow: hidden;
    background-color: var(--color-bg-alt);
}`, 
`.card-img-wrapper {
    position: relative;
    width: 100%;
    padding-top: 133%;
    overflow: hidden;
    background-color: var(--color-bg-alt);
    border-radius: 12px;
}`);

css = css.replace(
`.card-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 2.5s cubic-bezier(0.16, 1, 0.3, 1);
}`,
`.card-img {
    position: absolute;
    top: 5%;
    left: 5%;
    width: 90%;
    height: 90%;
    object-fit: cover;
    border-radius: 8px;
    transition: transform 2.5s cubic-bezier(0.16, 1, 0.3, 1);
}`);

fs.writeFileSync('src/app/globals.css', css);
