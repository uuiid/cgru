#include "listrenders.h"

#include <QtCore/QEvent>
#include <QtCore/QTimer>
#include <QtGui/QContextMenuEvent>
#include <QtGui/QInputDialog>
#include <QtGui/QLabel>
#include <QtGui/QLayout>
#include <QtGui/QMenu>

#include "../include/afanasy.h"

#include "../libafanasy/environment.h"
#include "../libafanasy/address.h"

#include "../libafqt/qmsg.h"

#include "actionid.h"
#include "dialog.h"
#include "itemrender.h"
#include "ctrlrenders.h"
#include "ctrlsortfilter.h"
#include "modelnodes.h"
#include "viewitems.h"
#include "watch.h"

#define AFOUTPUT
#undef AFOUTPUT
#include "../include/macrooutput.h"

bool    ListRenders::ConstHeight    = false;
int     ListRenders::SortType       = CtrlSortFilter::TPRIORITY;
bool    ListRenders::SortAscending  = false;
int     ListRenders::FilterType     = CtrlSortFilter::TNAME;
bool    ListRenders::FilterInclude  = true;
bool    ListRenders::FilterMatch    = false;
QString ListRenders::FilterString   = "";

ListRenders::ListRenders( QWidget* parent):
   ListNodes( parent, af::Msg::TRendersListRequest)
{
   ctrl = new CtrlSortFilter( this, &SortType, &SortAscending, &FilterType, &FilterInclude, &FilterMatch, &FilterString);
   ctrl->addSortType(   CtrlSortFilter::TNONE);
   ctrl->addSortType(   CtrlSortFilter::TPRIORITY);
   ctrl->addSortType(   CtrlSortFilter::TCAPACITY);
   ctrl->addSortType(   CtrlSortFilter::TTIMELAUNCHED);
   ctrl->addSortType(   CtrlSortFilter::TTIMEREGISTERED);
   ctrl->addSortType(   CtrlSortFilter::TNAME);
   ctrl->addSortType(   CtrlSortFilter::TTASKUSER);
   ctrl->addSortType(   CtrlSortFilter::TUSERNAME);
   ctrl->addSortType(   CtrlSortFilter::TVERSION);
   ctrl->addSortType(   CtrlSortFilter::TADDRESS);
   ctrl->addFilterType( CtrlSortFilter::TNONE);
   ctrl->addFilterType( CtrlSortFilter::TNAME);
   ctrl->addFilterType( CtrlSortFilter::TUSERNAME);
   ctrl->addFilterType( CtrlSortFilter::TTASKUSER);
   ctrl->addFilterType( CtrlSortFilter::TVERSION);
   ctrl->addFilterType( CtrlSortFilter::TADDRESS);
   initSortFilterCtrl();

   CtrlRenders * control = new CtrlRenders( ctrl, this);
   control->setToolTip("\
Sort & Filter Renders.\n\
Press RMB for Options.\
");
   ctrl->getLayout()->addWidget( control);

   eventsShowHide << af::Msg::TMonitorRendersAdd;
   eventsShowHide << af::Msg::TMonitorRendersChanged;
   eventsOnOff    << af::Msg::TMonitorRendersDel;

   timer = new QTimer( this);
   connect(timer, SIGNAL(timeout()), this, SLOT( requestResources()));
   timer->start( 990 * af::Environment::getRenderUpdateSec());

   parentWindow->setWindowTitle("Renders");

   init();

   connect( (ModelNodes*)model, SIGNAL(   nodeAdded( ItemNode *, const QModelIndex &)),
                          this,   SLOT( renderAdded( ItemNode *, const QModelIndex &)));

   if( false == af::Environment::VISOR())
      connect( view->selectionModel(), SIGNAL( selectionChanged( const QItemSelection &, const QItemSelection &)),
                                 this,   SLOT( selectionChanged( const QItemSelection &, const QItemSelection &)));

   QTimer * timer = new QTimer(this);
   timer->start( 1900 * af::Environment::getWatchRefreshInterval());
   connect( timer, SIGNAL( timeout()), this, SLOT( repaintItems()));
}

ListRenders::~ListRenders()
{
AFINFO("ListRenders::~ListRenders.")
}

void ListRenders::renderAdded( ItemNode * node, const QModelIndex & index)
{
   ItemRender * render = (ItemRender*)node;
   if( af::Environment::VISOR() == false)
   {
      if( render->getName().contains( QString::fromUtf8( af::Environment::getComputerName().c_str())) || render->getUserName() == QString::fromUtf8( af::Environment::getUserName().c_str()))
         view->selectionModel()->select( index, QItemSelectionModel::Select);
   }
}

void ListRenders::selectionChanged( const QItemSelection & selected, const QItemSelection & deselected )
{
   QModelIndexList indexes = selected.indexes();
   for( int i = 0; i < indexes.count(); i++)
      if( qVariantCanConvert<Item*>( indexes[i].data()))
      {
         ItemRender * render = (ItemRender*)qVariantValue<Item*>( indexes[i].data());
         if((false == render->getName().contains( QString::fromUtf8( af::Environment::getComputerName().c_str()))) && ( render->getUserName() != QString::fromUtf8( af::Environment::getUserName().c_str())))
            view->selectionModel()->select( indexes[i], QItemSelectionModel::Deselect);
      }
}

void ListRenders::requestResources()
{
   af::MCGeneral ids;
   for( int i = 0; i < model->count(); i++)
   {
      ItemRender *render = (ItemRender*)(model->item(i));
      if( render == NULL) continue;
      if( false == render->isOnline()) continue;
      ids.addId( render->getId());
   }

   if( ids.getCount())
   {
      Watch::sendMsg( new afqt::QMsg( af::Msg::TRendersUpdateRequestIds, &ids, true));
   }
}

void ListRenders::contextMenuEvent( QContextMenuEvent *event)
{
   ItemRender* render = (ItemRender*)getCurrentItem();
   if( render == NULL ) return;
   bool me = false;
   if( render->getName().contains( QString::fromUtf8( af::Environment::getComputerName().c_str())) || ( render->getUserName() == QString::fromUtf8( af::Environment::getUserName().c_str()))) me = true;
   int selectedItemsCount = getSelectedItemsCount();

   QMenu menu(this);
   QAction *action;

   action = new QAction( "Show Log", this);
   connect( action, SIGNAL( triggered() ), this, SLOT( actRequestLog() ));
   menu.addAction( action);

   action = new QAction( "Tasks Log", this);
   connect( action, SIGNAL( triggered() ), this, SLOT( actRequestTasksLog() ));
   menu.addAction( action);

   action = new QAction( "Show Info", this);
   connect( action, SIGNAL( triggered() ), this, SLOT( actRequestInfo() ));
   menu.addAction( action);

   if( me || af::Environment::VISOR())
   {
      menu.addSeparator();

      action = new QAction( "Set Priority", this);
      connect( action, SIGNAL( triggered() ), this, SLOT( actPriority() ));
      menu.addAction( action);
      action = new QAction( "Set NIMBY", this);
      if( selectedItemsCount == 1) action->setEnabled(false == render->isNIMBY());
      connect( action, SIGNAL( triggered() ), this, SLOT( actNIMBY() ));
      menu.addAction( action);
      action = new QAction( "Set nimby", this);
      if( selectedItemsCount == 1) action->setEnabled(false == render->isnimby());
      connect( action, SIGNAL( triggered() ), this, SLOT( actNimby() ));
      menu.addAction( action);
      action = new QAction( "Set Free", this);
      if( selectedItemsCount == 1) action->setEnabled(render->isnimby() || render->isNIMBY());
      connect( action, SIGNAL( triggered() ), this, SLOT( actFree() ));
      menu.addAction( action);
      action = new QAction( "Set User", this);
      connect( action, SIGNAL( triggered() ), this, SLOT( actUser() ));
      menu.addAction( action);

      menu.addSeparator();

      action = new QAction( "Annotate", this);
      connect( action, SIGNAL( triggered() ), this, SLOT( actAnnotate() ));
      menu.addAction( action);
      action = new QAction( "Change Capacity", this);
      connect( action, SIGNAL( triggered() ), this, SLOT( actCapacity() ));
      menu.addAction( action);
      action = new QAction( "Change Max Tasks", this);
      connect( action, SIGNAL( triggered() ), this, SLOT( actMaxTasks() ));
      menu.addAction( action);
      action = new QAction( "Enable Service", this);
      connect( action, SIGNAL( triggered() ), this, SLOT( actEnableService() ));
      menu.addAction( action);
      action = new QAction( "Disable Service", this);
      connect( action, SIGNAL( triggered() ), this, SLOT( actDisableService() ));
      menu.addAction( action);
      action = new QAction( "Restore Defaults", this);
      if( selectedItemsCount == 1) action->setEnabled(render->isDirty());
      connect( action, SIGNAL( triggered() ), this, SLOT( actRestoreDefaults() ));
      menu.addAction( action);

      menu.addSeparator();

      {
         QMenu * submenu = new QMenu( "Eject", this);

         action = new QAction( "Tasks", this);
         if( selectedItemsCount == 1) action->setEnabled(render->hasTasks());
         connect( action, SIGNAL( triggered() ), this, SLOT( actEject() ));
         submenu->addAction( action);

         menu.addMenu( submenu);
      }
   }

   if( af::Environment::GOD())
   {
      menu.addSeparator();

      {
         QMenu * submenu = new QMenu( "Exit", this);

         action = new QAction( "Render", this);
         if( selectedItemsCount == 1) action->setEnabled(render->isOnline());
         connect( action, SIGNAL( triggered() ), this, SLOT( actExit() ));
         submenu->addAction( action);

         menu.addMenu( submenu);
      }

      action = new QAction( "Delete Render", this);
      connect( action, SIGNAL( triggered() ), this, SLOT( actDelete() ));
      if( selectedItemsCount == 1) action->setEnabled(false == render->isOnline());
      menu.addAction( action);
   }

   QMenu * custom_submenu = NULL;
   int custom_cmd_index = 0;
   if(af::Environment::getRenderCmds().size() > 0)
   {
      menu.addSeparator();
      custom_submenu = new QMenu( "Custom", this);
      for( std::list<std::string>::const_iterator it = af::Environment::getRenderCmds().begin(); it != af::Environment::getRenderCmds().end(); it++, custom_cmd_index++)
      {
         ActionId * actionid = new ActionId( custom_cmd_index, QString("%1").arg( afqt::stoq(*it)), this);
         connect( actionid, SIGNAL( triggeredId( int ) ), this, SLOT( actCommand( int ) ));
         custom_submenu->addAction( actionid);
      }
      menu.addMenu( custom_submenu);
   }
   if( af::Environment::GOD() && ( af::Environment::getRenderCmdsAdmin().size() > 0 ))
   {
      if( custom_submenu == NULL)
      {
         menu.addSeparator();
         custom_submenu = new QMenu( "Custom", this);
      }
     for( std::list<std::string>::const_iterator it = af::Environment::getRenderCmdsAdmin().begin(); it != af::Environment::getRenderCmdsAdmin().end(); it++, custom_cmd_index++)
      {
         ActionId * actionid = new ActionId( custom_cmd_index, QString("%1").arg( afqt::stoq(*it)), this);
         connect( actionid, SIGNAL( triggeredId( int ) ), this, SLOT( actCommand( int ) ));
         custom_submenu->addAction( actionid);
      }
      menu.addMenu( custom_submenu);
   }

   menu.addSeparator();

   if( af::Environment::GOD())
   {
      {
         QMenu * submenu = new QMenu( "Wake-On-Lan", this);

         action = new QAction( "Sleep", this);
         if( selectedItemsCount == 1) action->setEnabled( render->isOnline() && ( false == render->isBusy()) && ( false == render->isWOLFalling()));
         connect( action, SIGNAL( triggered() ), this, SLOT( actWOLSleep()));
         submenu->addAction( action);
         action = new QAction( "Wake", this);
         if( selectedItemsCount == 1) action->setEnabled( render->isOffline());
         connect( action, SIGNAL( triggered() ), this, SLOT( actWOLWake()));
         submenu->addAction( action);

         menu.addMenu( submenu);
      }

      {
         QMenu * submenu = new QMenu( "Restart", this);

         action = new QAction( "Render", this);
         if( selectedItemsCount == 1) action->setEnabled(render->isOnline());
         connect( action, SIGNAL( triggered() ), this, SLOT( actRestart() ));
         submenu->addAction( action);

         menu.addMenu( submenu);
      }

      {
         QMenu * submenu = new QMenu( "Reboot", this);

         action = new QAction( "Computer", this);
         if( selectedItemsCount == 1) action->setEnabled(render->isOnline());
         connect( action, SIGNAL( triggered() ), this, SLOT( actReboot() ));
         submenu->addAction( action);

         menu.addMenu( submenu);
      }

      menu.addSeparator();

      {
         QMenu * submenu = new QMenu( "Shutdown", this);

         action = new QAction( "Computer", this);
         if( selectedItemsCount == 1) action->setEnabled(render->isOnline());
         connect( action, SIGNAL( triggered() ), this, SLOT( actShutdown() ));
         submenu->addAction( action);

         menu.addMenu( submenu);
      }
   }

   menu.exec( event->globalPos());
}

void ListRenders::doubleClicked( Item * item)
{
   actRequestInfo();
}

bool ListRenders::caseMessage( af::Msg * msg)
{
#ifdef AFOUTPUT
   msg->stdOut();
#endif
   switch( msg->type())
   {
   case af::Msg::TRendersList:
      subscribe();
   case af::Msg::TRendersListUpdates:
   {
      updateItems( msg);
      calcTitle();
      break;
   }
   case af::Msg::TMonitorRendersDel:
   {
      af::MCGeneral ids( msg);
      deleteItems( ids);
      calcTitle();
      break;
   }
   case af::Msg::TMonitorRendersAdd:
   {
      af::MCGeneral ids( msg);
      deleteItems( ids);
      Watch::sendMsg( new afqt::QMsg( af::Msg::TRendersListRequestIds, &ids, true));
      break;
   }
   case af::Msg::TMonitorRendersChanged:
   {
      af::MCGeneral ids( msg);
      Watch::sendMsg( new afqt::QMsg( af::Msg::TRendersListRequestIds, &ids, true));
      break;
   }
   default:
      return false;
   }
   return true;
}

ItemNode* ListRenders::createNewItem( af::Node *node)
{
   return new ItemRender( (af::Render*)node);
}

void ListRenders::calcTitle()
{
   int total = count();
   int online = 0;
   int busy = 0;
   int nimby = 0;
   int free = 0;
   for( int i = 0; i < total; i++)
   {
      ItemRender * itemrender = (ItemRender*)(model->item(i));
      if( itemrender->isOnline()) online++;
      if( itemrender->isBusy()) busy++;
      if( itemrender->isnimby() || itemrender->isNIMBY()) nimby++;
      else if( itemrender->isOnline() && (false == itemrender->isBusy())) free++;
   }
   parentWindow->setWindowTitle(QString("R[%1/%2]: B%3/%4F (n%5)").arg( total).arg( online).arg( busy).arg( free).arg( nimby));
}

void ListRenders::actPriority()
{
   ItemRender* item = (ItemRender*)getCurrentItem();
   if( item == NULL ) return;
   int current = item->getPriority();

   bool ok;
   uint8_t priority = QInputDialog::getInteger(this, "Change Priority", "Enter New Priority", current, 0, 250, 1, &ok);
   if( !ok) return;
   af::MCGeneral mcgeneral( priority);
   action( mcgeneral, af::Msg::TRenderSetPriority);
}
void ListRenders::actCapacity()
{
   ItemRender* item = (ItemRender*)getCurrentItem();
   if( item == NULL ) return;
   int current = item->getCapacity();

   bool ok;
   int32_t capacity = QInputDialog::getInteger(this, "Change Capacity", "Enter New Capacity", current, -1, 1000000, 1, &ok);
   if( !ok) return;
   af::MCGeneral mcgeneral( capacity);
   action( mcgeneral, af::Msg::TRenderSetCapacity);
}
void ListRenders::actMaxTasks()
{
   ItemRender* item = (ItemRender*)getCurrentItem();
   if( item == NULL ) return;
   int current = item->getMaxTasks();

   bool ok;
   int32_t maxtasks = QInputDialog::getInteger(this, "Change Capacity", "Enter New Capacity", current, -1, 1000000, 1, &ok);
   if( !ok) return;
   af::MCGeneral mcgeneral( maxtasks);
   action( mcgeneral, af::Msg::TRenderSetMaxTasks);
}
void ListRenders::actNIMBY()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderSetNIMBY);
}
void ListRenders::actNimby()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderSetNimby);
}
void ListRenders::actFree()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderSetFree);
}
void ListRenders::actUser()
{
   QString current = afqt::stoq( af::Environment::getUserName());

   bool ok;
   QString text = QInputDialog::getText(this, "Set User", "Enter User Name", QLineEdit::Normal, current, &ok);
   if( !ok) return;

   af::MCGeneral mcgeneral( afqt::qtos( text));
   action( mcgeneral, af::Msg::TRenderSetUser);
}
void ListRenders::actEject()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderEject);
}
void ListRenders::actExit()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderExit);
}
void ListRenders::actDelete()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderDelete);
}
void ListRenders::actRestart()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderRestart);
}
void ListRenders::actReboot()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderReboot);
}
void ListRenders::actShutdown()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderShutdown);
}
void ListRenders::actWOLSleep()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderWOLSleep);
}
void ListRenders::actWOLWake()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderWOLWake);
}

void ListRenders::actRequestLog()
{
   Item* item = getCurrentItem();
   if( item == NULL ) return;
   displayInfo( "Render log request.");
   afqt::QMsg * msg = new afqt::QMsg( af::Msg::TRenderLogRequestId, item->getId(), true);
   Watch::sendMsg( msg);
}

void ListRenders::actRequestTasksLog()
{
   Item* item = getCurrentItem();
   if( item == NULL ) return;
   displayInfo( "Render tasks log request.");
   afqt::QMsg * msg = new afqt::QMsg( af::Msg::TRenderTasksLogRequestId, item->getId(), true);
   Watch::sendMsg( msg);
}

void ListRenders::actRequestInfo()
{
   Item* item = getCurrentItem();
   if( item == NULL ) return;
   displayInfo( "Render info request.");
   afqt::QMsg * msg = new afqt::QMsg( af::Msg::TRenderInfoRequestId, item->getId(), true);
   Watch::sendMsg( msg);
}

void ListRenders::actAnnotate()
{
   ItemRender* item = (ItemRender*)getCurrentItem();
   if( item == NULL ) return;
   QString current = item->getAnnotation();

   bool ok;
   QString text = QInputDialog::getText(this, "Annotate", "Enter Annotation", QLineEdit::Normal, current, &ok);
   if( !ok) return;

   af::MCGeneral mcgeneral( afqt::qtos( text));
   action( mcgeneral, af::Msg::TRenderAnnotate);
}

void ListRenders::actEnableService()  { setService( true );}
void ListRenders::actDisableService() { setService( false);}
void ListRenders::setService( bool enable)
{
   Item* item = getCurrentItem();
   if( item == NULL ) return;
   QString caption("Service");
   if( enable ) caption = "Enable " + caption; else caption = "Disable " + caption;

   bool ok;
   QString service = QInputDialog::getText(this, caption, "Enter Service Name", QLineEdit::Normal, QString(), &ok);
   if( !ok) return;

   af::MCGeneral mcgeneral;
   mcgeneral.setString( afqt::qtos( service));
   mcgeneral.setNumber( enable);
   action( mcgeneral, af::Msg::TRenderSetService);
}

void ListRenders::actRestoreDefaults()
{
   af::MCGeneral mcgeneral;
   action( mcgeneral, af::Msg::TRenderRestoreDefaults);
}

void ListRenders::actCommand( int number)
{
   std::list<std::string> commands;
   // Create a list that contains and user and admin commands:
   for( std::list<std::string>::const_iterator it = af::Environment::getRenderCmds().begin(); it != af::Environment::getRenderCmds().end(); it++)
      commands.push_back( *it);
   for( std::list<std::string>::const_iterator it = af::Environment::getRenderCmdsAdmin().begin(); it != af::Environment::getRenderCmdsAdmin().end(); it++)
      commands.push_back( *it);

   if( number >= commands.size())
   {
      displayError( "No such command.");
      return;
   }

   QModelIndexList indexes( view->selectionModel()->selectedIndexes());

   std::list<std::string>::const_iterator it = commands.begin();
   for( int i = 0; i < number; i++ ) it++;
   QString cmd( afqt::stoq(*it));

   if( cmd.contains( AFWATCH::CMDS_ASKCOMMAND))
   {
      bool ok;
      QString text = QInputDialog::getText(this, "Launch Command",
         QString("Enter string to replace %1 in\n%2").arg(AFWATCH::CMDS_ASKCOMMAND).arg(cmd), QLineEdit::Normal, "", &ok);
      if( !ok) return;
      cmd.replace( AFWATCH::CMDS_ASKCOMMAND, text);
   }

   if( indexes.count() < 1 )
   {
      ItemRender * item = (ItemRender*)(getCurrentItem());
      cmd.replace( AFWATCH::CMDS_ARGUMENT, item->getName());
      cmd.replace( AFWATCH::CMDS_IPADDRESS, item->getIPString());
      Watch::startProcess( cmd);
      return;
   }

   for( int i = 0; i < indexes.count(); i++)
   {
      if( false == qVariantCanConvert<Item*>( indexes[i].data())) continue;
      ItemRender * item = (ItemRender*)(qVariantValue<Item*>( indexes[i].data()));
      if( item == NULL ) continue;
      QString final_command(cmd);
      final_command.replace( AFWATCH::CMDS_ARGUMENT, item->getName());
      final_command.replace( AFWATCH::CMDS_IPADDRESS, item->getIPString());
      Watch::startProcess( final_command);
   }
}
