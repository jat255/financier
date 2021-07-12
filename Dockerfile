FROM node:8

WORKDIR /financier
COPY ./src/ /financier/src/
COPY .babelrc .eslintrc package.json package-lock.json .jsdoc.json karma.conf.js postcss.config.js webpack.config.js /financier/

RUN npm install express@^4.13.0 helmet@^3.10.0 uuid helmet-csp@^2.7.0 cheerio@^0.22.0 lato-webfont@github:aeharding/lato-webfont
# RUN npm run lint
# RUN npm test
RUN npm run build

ADD README.md /financier
RUN npm run docs

# ADD ./dist /financier/dist
# ADD ./docs /financier/docs
ADD ./api /financier/api

WORKDIR /financier/api

EXPOSE 8080

# RUN apt-get install -y git-core

CMD node ./index.js
