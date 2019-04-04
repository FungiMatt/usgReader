//Author: Matheus de Souza
const fs = require('fs');
const os = require('os');
const osUtils = require('os-utils');
const si = require('systeminformation');
var mkdirp = require('mkdirp');
var http = require('http');

var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('conf.properties');

require('console-stamp')(console, '[HH:MM:ss]');

const bToGb = Math.pow(10, 9);
var iCPU = 0;
var cpuArray = [];

let path = os.platform() === 'win32' ? 'c:' : '/';

var format = require('dateformat');
var data = new Date(Date.now()).toLocaleString();
var dataFormat = format(data, 'isoDate')

var logFilename = `monitoring_${dataFormat}`
const usgLogger = require('log4js');

usgLogger.configure({
	appenders: { mylogger: { type:"file", filename: `log/${logFilename}.log` } },
    categories: { default: { appenders:["mylogger"], level:"ALL" } }
});

const logger = usgLogger.getLogger("default");

var intervalo=0;
var jsonPost;

function tudo(){
	newFilename = 'monitoring_'+(format(new Date(Date.now()).toLocaleString(), 'isoDate'));

	if(logFilename!=newFilename&&intervalo>0){
		var dataFormat = format(data, 'isoDate')
		var logFilename = `monitoring_${dataFormat}`
		usgLogger.configure({
			appenders: { mylogger: { type:"file", filename: `log/${logFilename}.log` } },
		    categories: { default: { appenders:["mylogger"], level:"ALL" } }
		});

		logger.info('Ferramenta de monitoramento de recursos');
	}

	si.mem(function(mem){

		const memTotal = ((mem.total/bToGb).toFixed(2));
		const memUsada = ((mem.used/bToGb).toFixed(2));
		const memLivre = ((mem.free/bToGb).toFixed(2));

		console.log(`Memória total = ${memTotal}GB`);
		console.log(`Memória em uso = ${memUsada}GB`);
		console.log(`Memória Livre = ${memLivre}GB`);

		logger.info(`Memória total = ${memTotal}GB`);
		logger.info(`Memória em uso = ${memUsada}GB`);
		logger.info(`Memória Livre = ${memLivre}GB`);

		let jsonMem = `"memoria_total": ${memTotal},\n`
		+`"memoria_usada": ${memUsada},\n`
		+`"memoria_livre": ${memLivre},`;

		jsonPost = jsonMem;
	});

	si.fsSize(function(disco){
    var i;

    for (i=0;i<disco.length;i++){
			var raiz = process.cwd();
      const hdd = disco[i].fs;
      const espacoTotal = ((disco[i].size/bToGb).toFixed(0));
      const espacoUso = ((disco[i].used/bToGb).toFixed(0));
      const percUso = ((disco[i].use).toFixed(0));
      const espacoDisp = (((disco[i].size/bToGb).toFixed(0))-((disco[i].used/bToGb).toFixed(0)));
      const percDisp = (100-percUso);

			if(`${hdd}\\ws\\install\\usgReader`==raiz||hdd=='C:'){
	      console.log(`Disco ${hdd}`);
				logger.info(`Disco ${hdd}`);

	      if(isNaN(espacoTotal)){
	        console.log('Informações de espaço indisponíveis');
					logger.info('Informações de espaço indisponíveis');
	      } else{
	        console.log(`Espaço total = ${espacoTotal}GB`);
					logger.info(`Espaço total = ${espacoTotal}GB`);
	        console.log(`Espaço em uso = ${espacoUso}GB (${percUso}%)`);
					logger.info(`Espaço em uso = ${espacoUso}GB$ (${percUso}%)`);
	        console.log(`Espaço disponível = ${espacoDisp}GB (${percDisp}%)`);
					logger.info(`Espaço disponível = ${espacoDisp}GB$ (${percDisp}%)`);
	      }

				var jsonDisco;
				var dadosDisco;

				dadosDisco = `{\n"disco_unidade": "${hdd}",\n`
	        +`"disco_espaco_total": ${espacoTotal},\n`
	        +`"disco_espaco_usado": ${espacoUso},\n`
	        +`"disco_espaco_disponivel": ${espacoDisp}\n}`;

				if (i==0||!jsonDisco){
					jsonDisco = dadosDisco;
				} else {
					jsonDisco = `${jsonDisco},\n${dadosDisco}`;
				}
			}
    }

		jsonPost = `${jsonPost}\n"discos": [\n${jsonDisco}\n],`;
  });

	osUtils.cpuUsage(function(cpuPerc){
		const usoCPU = ((cpuPerc*100).toFixed(0));

		cpuArray[iCPU] = usoCPU;
		iCPU++;

		if(iCPU==11){
			iCPU=0;
		};

		console.log(`Uso de CPU (%): ${usoCPU}`);
		logger.info(`Uso de CPU (%): ${usoCPU}`);

		let jsonCPU = `"cpu_usado": ${usoCPU}`

		jsonPost = `${jsonPost}\n${jsonCPU}`;
	});

	console.log("=".repeat(70));
	logger.info("=".repeat(70));

	var configDest = {
		hostname: properties.get('host_api'),
		//port: 3000,
		path: '/monitorings',
		method: 'POST',
		headers: {
				'Content-Type': 'application/json'
		}
	};

	var dataJson = new Date(Date.now()).toLocaleString();
	var dataJsonFormat = format(dataJson, 'isoDateTime')

	if(jsonPost){
		jsonPost = `{\n"empresa": "${properties.get('empresa')}",\n${jsonPost},\n"data_registro": "${dataJsonFormat}"\n}`

		var req = http.request(configDest, function (res) {
				console.log('STATUS:', res.statusCode);
				logger.info('STATUS:', res.statusCode);
				console.log('HEADERS:', JSON.stringify(res.headers));
				logger.info('HEADERS:', JSON.stringify(res.headers));

				res.setEncoding('utf8');

				res.on('data', function (chunk) {
						console.log('BODY:', chunk);
						logger.info('BODY:', chunk);
				});

				res.on('end', function () {
						console.log('No more data in response.');
				});
		});

		req.on('error', function (e) {
				console.log('Problem with request:', e.message);
				logger.error('Problem with request:', e.message);
				logger.error(jsonPost);
		});

		req.write(jsonPost);
		logger.info(jsonPost);
		req.end();
	}
};

if(intervalo==0){
	intervalo++;
	console.log('Ferramenta de monitoramento de recursos');
	//logger.info('Ferramenta de monitoramento de recursos');
	tudo();
}

if (intervalo>0){
	setInterval(tudo, properties.get('interval'));
};
