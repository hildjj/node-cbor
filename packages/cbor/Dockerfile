FROM node:latest
MAINTAINER Joe Hildebrand <joe-github@cursive.net>

VOLUME /root/.npm
RUN npm install -g nodeunit grunt grunt-cli istanbul

ADD . /opt/cbor
WORKDIR /opt/cbor

RUN npm install

CMD ["nodeunit", "test"]
