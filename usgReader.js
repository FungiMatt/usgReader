//Author: Matheus de Souza
const fs = require('fs');
const os = require('os');
const osUtils = require('os-utils');
const si = require('systeminformation');
var mkdirp = require('mkdirp');

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

		let dadosMem = {
      memoria_total: memTotal,
      memoria_uso: memUsada,
      memoria_livre: memLivre,
    };

    let jsonMem = JSON.stringify(dadosMem, null, 2);
		fs.writeFileSync('mem.json', jsonMem);
		jsonPost = jsonMem;
	});

	si.fsSize(function(disco){
    var i;

    for (i=0;i<disco.length;i++){
      const hdd = disco[i].fs;
      const espacoTotal = ((disco[i].size/bToGb).toFixed(0));
      const espacoUso = ((disco[i].used/bToGb).toFixed(0));
      const percUso = ((disco[i].use).toFixed(0));
      const espacoDisp = (((disco[i].size/bToGb).toFixed(0))-((disco[i].used/bToGb).toFixed(0)));
      const percDisp = (100-percUso);

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

			dadosDisco = {
        disco_unidade: hdd,
        disco_espaco_total: espacoTotal,
        disco_espaco_usado: espacoUso,
        disco_espaco_disponivel: espacoDisp,
      };

			if (i==0){
				jsonDisco = JSON.stringify(dadosDisco, null, 2);
			} else {
				jsonDisco = `${jsonDisco},\n${JSON.stringify(dadosDisco, null, 2)}`;
			}
    }

		fs.writeFileSync('hdd.json', jsonDisco);
		jsonPost = `${jsonPost},\n${jsonDisco}`;

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

		let dadosCPU = {
			cpu_perc_uso_atual: usoCPU,
		};

		let jsonCPU = JSON.stringify(dadosCPU, null, 2);
		fs.writeFileSync('cpu.json', jsonCPU);
		jsonPost = `${jsonPost},\n${jsonCPU}`;
	});

	console.log("=".repeat(70));
	logger.info("=".repeat(70));

	var configDest = {
		hostname: 'localhost',
		port: 6660,
		method: 'POST',
		headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': dataMem.length
		}
	};

	var req = http.request(options, function (res) {
			console.log('STATUS:', res.statusCode);
			console.log('HEADERS:', JSON.stringify(res.headers));

			res.setEncoding('utf8');

			res.on('data', function (chunk) {
					console.log('BODY:', chunk);
			});

			res.on('end', function () {
					console.log('No more data in response.');
			});
	});

	req.on('error', function (e) {
			console.log('Problem with request:', e.message);
	});

	req.write(jsonPost);
	req.end();

};

if(intervalo==0){
	intervalo++;
	console.log('Ferramenta de monitoramento de recursos');
	//logger.info('Ferramenta de monitoramento de recursos');
	tudo();
}

if (intervalo>0){
	setInterval(tudo, 5000);
};
