#!/usr/bin/env bash
set -euo pipefail
cd /workspace/ToolMavo
mkdir -p /workspace/.cache /workspace/toolchains
export npm_config_cache=/workspace/.cache/npm
if [ ! -x /workspace/toolchains/java/bin/javac ]; then
  curl -fL https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.tar.gz -o /tmp/toolmavo-jdk.tar.gz
  mkdir -p /workspace/toolchains/java
  tar -xzf /tmp/toolmavo-jdk.tar.gz -C /workspace/toolchains/java --strip-components=1
fi
export JAVA_HOME=/workspace/toolchains/java
export MAVEN_OPTS="${MAVEN_OPTS:-} -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts"
export PATH="$JAVA_HOME/bin:/workspace/apache-maven-3.9.11/bin:$PATH"
if [ ! -x /workspace/apache-maven-3.9.11/bin/mvn ]; then
  curl -fL https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.tar.gz -o /tmp/toolmavo-maven.tar.gz
  tar -xzf /tmp/toolmavo-maven.tar.gz -C /workspace
fi
# Maven does not automatically honor the cloud HTTPS_PROXY binding.
python3 - <<'PY'
import os,urllib.parse,pathlib,xml.sax.saxutils as x
p=urllib.parse.urlparse(os.environ.get('HTTPS_PROXY',os.environ.get('https_proxy','')))
s='<settings>'
if p.hostname:
 s+='<proxies><proxy><id>cloud</id><active>true</active><protocol>http</protocol><host>'+x.escape(p.hostname)+'</host><port>'+str(p.port or 80)+'</port></proxy></proxies>'
s+='</settings>'
pathlib.Path('/workspace/.cache/maven-settings.xml').write_text(s)
PY
(cd frontend && npm ci --no-audit --no-fund && npm test && npm run build)
(cd backend && mvn -s /workspace/.cache/maven-settings.xml -Dmaven.repo.local=/workspace/.cache/m2 -B package)
