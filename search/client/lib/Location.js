import { canUseDOM } from 'fbjs/lib/ExecutionEnvironment';
import createHistory from 'history/lib/createBrowserHistory';
import useQueries from 'history/lib/useQueries';

const Location = canUseDOM ? useQueries(createHistory)() : {};

export default Location;
