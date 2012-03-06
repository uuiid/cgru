#include "cmd_config.h"

#include "../libafanasy/environment.h"

#define AFOUTPUT
#undef AFOUTPUT
#include "../include/macrooutput.h"

CmdConfigLoad::CmdConfigLoad()
{
   setCmd("cload");
   setInfo("Request server to reload config file.");
   setHelp("cload Request server to reload configuration.");
   setMsgType( af::Msg::TConfigLoad);
   setRecieving();
}
CmdConfigLoad::~CmdConfigLoad(){}
bool CmdConfigLoad::processArguments( int argc, char** argv, af::Msg &msg)
{
   msg.set( af::Msg::TConfigLoad);
   return true;
}
