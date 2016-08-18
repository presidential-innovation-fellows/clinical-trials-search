#!/bin/sh
USAGE="usage: nightly_load"

#####################################################################################
# Constants
#####################################################################################

export SCRIPT_USER=nutch
export THIS_SCRIPT_NAME=`basename "$0"`   # e.g. "nightly_load"
export THIS_HOST_NAME=`uname -n`          # e.g. "ip-172-16-1-50"
declare -i DEBUG_MODE=0                   # set to anything intiger greater than 0 to enable debugging output to log file and STDOUT

# Directories
export CTAPI_BASE_DIR=/
export TRANSFORMER_DIR=$CTAPI_BASE_DIR/import/transform
export INDEXER_DIR=$CTAPI_BASE_DIR/search/index
export DATA_DIR=$CTAPI_BASE_DIR/data

# Sanity Check Settings
declare -i DISK_SPACE_WARN_THRESHOLD=20000000   # In kB. Send a warning email if data disk space drops below this level.
declare -i DISK_SPACE_ERROR_THRESHOLD=10000000  # In kB. Do not run transform/indexing script if data disk space drops below this level.

# Email
export NOTIFICATION_EMAIL_RECIPIENTS=NCIAppAlerts@mail.nih.gov



#####################################################################################
# Functions
#####################################################################################

#####################################################################################
#
# logger function
#
# Call this function to write to the log file NIGHTLY_CRAWL_LOG_FILE
#

function logger
{
  if [ $# -gt 0 ]; then
    echo "[$(date +"%Y%m%d-%H:%M:%S") $THIS_SCRIPT_NAME] $@" >> $NIGHTLY_CRAWL_LOG_FILE
    echo "[$(date +"%Y%m%d-%H:%M:%S") $THIS_SCRIPT_NAME] $@"
  else
    while read data
    do
      echo "[$(date +"%Y%m%d-%H:%M:%S") $THIS_SCRIPT_NAME] $data" >> $NIGHTLY_CRAWL_LOG_FILE
      echo "[$(date +"%Y%m%d-%H:%M:%S") $THIS_SCRIPT_NAME] $data"
    done
  fi
}

#####################################################################################
#
# debug function
#
# Call this function to log DEBUG info if DEBUG_MODE is set to greater than 0.
#

function debug
{
  if [[ "$DEBUG_MODE" -gt 0 ]]; then
    logger "DEBUG: $@"
  fi
}

####################################################################################
#
# exit_on_error function
#
# Call this function to exit this script if an error is encountered.  This function
# will:
#         1) Send an email to the NOTIFICATION_EMAIL_RECIPIENTS.
#         2) Log the exit event and the line numebr that this function was called at
#            in the main body of the script to the NIGHTLY_CRAWL_LOG_FILE.
#         3) exit the script with an error code of 1.

function exit_on_error
{
  EXIT_LINE_NUMBER=$1
  ERROR_MESSAGE=$2

  email_notification "exited after error at line number $EXIT_LINE_NUMBER"  "ERROR: $ERROR_MESSAGE"

  logger $ERROR_MESSAGE
  logger "ERROR: Exiting $THIS_SCRIPT_NAME after error with exit code 1 at line number: $EXIT_LINE_NUMBER. Goodbye."

  exit 1
}

#####################################################################################
#
# email_notification function
#
# This function will send a notification email to NOTIFICATION_EMAIL_RECIPIENTS.
#

function email_notification
{
  SUBJECT=$1
  MESSAGE=$2

  SUBJECT_FINAL="$THIS_SCRIPT_NAME on $THIS_HOST_NAME: $SUBJECT"
  MESSAGE_FINAL="$THIS_SCRIPT_NAME on $THIS_HOST_NAME at $(date +"%Y%m%d-%H:%M:%S"): $MESSAGE"

  #echo "................................. EMAIL: $SUBJECT_FINAL: $MESSAGE_FINAL"
  ( echo $MESSAGE_FINAL ) | /bin/mailx -s "$SUBJECT_FINAL" $NOTIFICATION_EMAIL_RECIPIENTS

  if (( $? )) ; then
    logger "ERROR: email_notification: mailx exited with non-zero status code $? while trying to send: Subject: $SUBJECT_FINAL, Message: $MESSAGE_FINAL"
  fi
}

#####################################################################################
# Script Main Body
#####################################################################################


#####################################################################################
#
# Intro
#

logger "INFO: This is the start of the $THIS_SCRIPT_NAME script."

#####################################################################################
#
# Make sure only user nutch can run this script
#

CURRENT_USER=`id -un`
if [ "$CURRENT_USER" != "SCRIPT_USER" ]; then
   echo "ERROR: This script must be run as user $SCRIPT_USER" 1>&2
   exit 1
fi

debug "My user name is $CURRENT_USER"
debug "SCRIPT_USER should be $SCRIPT_USER to continue"

######################################################################################
#
# Set current working directory to COLLECTION_CURRENT_WORKING_DIR
#

cd $CTAPI_BASE_DIR
exit_status=$?

if (( $exit_status )) ; then
  logger "ERROR: Set Curent Working Directory: Could not cd to $CTAPI_BASE_DIR.  cd exited with non-zero status code $exit_status"
  exit_on_error $LINENO "ERROR: Set Curent Working Directory: Could not cd to $CTAPI_BASE_DIR.  cd exited with non-zero status code $exit_status"
fi


logger "INFO: The current working directory is now $(pwd)"

######################################################################################
#
# Pre Flight Sanity Check
#

logger "INFO: Start Preflight Sanity Checklist"

# Get the current amount of free disk space in kB on the data file system.
declare -i DISK_SPACE_AVAILABLE=`df -Pk $CTAPI_BASE_DIR | tail -1 | awk '{print $4}'`

logger "INFO: Data disk space available for $CTAPI_BASE_DIR is $DISK_SPACE_AVAILABLE kB"

# Do we have enough space on the data file system to continue?
if [[ "$DISK_SPACE_AVAILABLE" -lt "$DISK_SPACE_ERROR_THRESHOLD" ]]; then
  exit_on_error $LINENO "ERROR: Not enough data disk space in $CTAPI_BASE_DIR to continue. Current space available is $DISK_SPACE_AVAILABLE. Must have at least $DISK_SPACE_ERROR_THRESHOLD kB."
fi


# Are we close to running out of space on the data files system?
if [[ "$DISK_SPACE_AVAILABLE" -lt "$DISK_SPACE_WARN_THRESHOLD" ]]; then
  logger "WARNING: We are getting low on disk space for $CTAPI_BASE_DIR.  Some one should do something to fix this."
  logger "WARNING: Current space available is $DISK_SPACE_AVAILABLE. Must have at least $DISK_SPACE_ERROR_THRESHOLD kB to run."
  logger "WARNING: Please make at least $DISK_SPACE_WARN_THRESHOLD kB free space available to avoid this warning."

  EMAIL_SUBJECT="WARNING: Low disk space for $COLLECTION_BASE_DIR."
  EMAIL_MESSAGE="WARNING: We are getting low on disk space for $CTAPI_BASE_DIR.  Some one should do something to fix this.  Current space available is $DISK_SPACE_AVAILABLE. Must have at least $DISK_SPACE_ERROR_THRESHOLD kB to run.  Please make at least $DISK_SPACE_WARN_THRESHOLD kB free space available to avoid this warning."

  email_notification $EMAIL_SUBJECT $EMAIL_MESSAGE
fi

logger "INFO: End Preflight Sanity Checklist"




####
## Put download from S3, Transform and indexing here.
####











#############################################################################################
#
# Nightly Crawl Completed Successfully
#
# Send email notification and log that crawl has completed successfully
#

ALL_IS_WELL_MESSAGE="INFO: $THIS_SCRIPT_NAME has completed successfully."

logger $ALL_IS_WELL_MESSAGE
email_notification "$THIS_SCRIPT_NAME has completed successfully"  $ALL_IS_WELL_MESSAGE



#############################################################################################
#
# Exit the script with status code 0 since there were no errors.  All is well.  Good bye!
#

exit 0
