// version 1.0.7
// 20210812 merge upstream

window.addEventListener('load', () => {
  initDT(); // Initialize the DatatTable and window.columnNames variables
  addDarkmodeWidget();

  const repo = getRepoFromUrl();

  if (repo) {
    document.getElementById('q').value = repo;
    fetchData();
  }
});

document.getElementById('form').addEventListener('submit', e => {
  e.preventDefault();
  fetchData();
});

function addDarkmodeWidget() {
  new Darkmode( { label: '🌓' } ).showWidget();
}

function fetchData() {
  const repo = document.getElementById('q').value;
  const re = /[-_\w]+\/[-_.\w]+/;

  const urlRepo = getRepoFromUrl();

  if (!urlRepo || urlRepo !== repo) {
    window.history.pushState('', '', `#${repo}`);
  }

  if (re.test(repo)) {
    fetchAndShow(repo);
    fetchAndShow1(repo)
  } else {
    showMsg(
      'Invalid GitHub repository! Format is &lt;username&gt;/&lt;repo&gt;',
      'danger'
    );
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateDT(data, repo, ownerAndBranch) {
  // Remove any alerts, if any:
  if ($('.alert')) $('.alert').remove();

  // Format dataset and redraw DataTable. Use second index for key name
  const forks = [];
  for (let fork of data) {
    fork.repoLink = `<a href="https://github.com/${fork.full_name}">Link</a>`;
    fork.ownerName = fork.owner.login;
    //if ( typeof ownerAndBranch !== 'undefined' ) {
    //  fork.status = ownerAndBranch;
    //} else {
    //  fork.status = ''
    //}
    fork.status = await fetchForkInfo(repo, ownerAndBranch, fork.ownerName, fork.default_branch);
    await sleep(50);
    console.log(fork.status);
    if ( fork.status.localeCompare("identical+0") != 0 ) {
      forks.push(fork);
    }
  }
  const dataSet = forks.map(fork =>
    window.columnNamesMap.map(colNM => fork[colNM[1]])
  );
  window.forkTable
    .clear()
    .rows.add(dataSet)
    .draw();
}

function initDT() {
  // Create ordered Object with column name and mapped display name
  window.columnNamesMap = [
    // [ 'Repository', 'full_name' ],
    ['Link', 'repoLink'], // custom key
    ['Owner', 'ownerName'], // custom key
    ['Name', 'name'],
    ['Branch', 'default_branch'],
    ['Stars', 'stargazers_count'],
    ['Forks', 'forks'],
    ['Open Issues', 'open_issues_count'],
    ['Size', 'size'],
    ['Last Push', 'pushed_at'],
    ['Status', 'status'],
  ];

  // Sort by stars:
  const sortColName = 'Stars';
  const sortColumnIdx = window.columnNamesMap
    .map(pair => pair[0])
    .indexOf(sortColName);

  // Use first index for readable column name
  // we use moment's fromNow() if we are rendering for `pushed_at`; better solution welcome
  window.forkTable = $('#forkTable').DataTable({
    columns: window.columnNamesMap.map(colNM => {
      return {
        title: colNM[0],
        render:
          colNM[1] === 'pushed_at'
            ? (data, type, _row) => {
                if (type === 'display') {
                  return moment(data).fromNow();
                }
                return data;
              }
            : null,
      };
    }),
    order: [[sortColumnIdx, 'desc']],
    // paging: false,
    searchBuilder:{
      // all options at default
    }
  });
  let table = window.forkTable;
  new $.fn.dataTable.SearchBuilder(table, {});
  table.searchBuilder.container().prependTo(table.table().container());
}

async function fetchAndShow(repo) {
  repo = repo.replace('https://github.com/', '');
  repo = repo.replace('http://github.com/', '');
  repo = repo.replace(/\.git$/, '');

  var ownerAndBranch = await fetchRepoInfo(repo);

  // for example, https://api.github.com/repos/techgaun/active-forks/forks?sort=stargazers&per_page=100
  fetch(
    `https://api.github.com/repos/${repo}/forks?sort=stargazers&per_page=100&client_id=fe51cb18a764a29fc455&client_secret=8f7b630d487247659702cca0ebb7242b50dd91db`
  )
    .then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then(data => {
      console.log(data);
      console.log('fetchAndShow.ownerrAndBranch = ',ownerAndBranch);
      console.log('fetchAndShow.repo = ',repo);
      updateDT(data, repo, ownerAndBranch);
    })
    .catch(error => {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');
      console.error(error);
    });
}

async function fetchAndShow1(repo) {
  repo = repo.replace('https://github.com/', '');
  repo = repo.replace('http://github.com/', '');
  repo = repo.replace(/\.git$/, '');

  var ownerAndBranch = await fetchRepoInfo(repo);
  
  // for example, https://api.github.com/repos/techgaun/active-forks/forks?sort=stargazers&per_page=100
  fetch(
    `https://api.github.com/repos/${repo}/forks?sort=stargazers&page=2&per_page=100&client_id=fe51cb18a764a29fc455&client_secret=8f7b630d487247659702cca0ebb7242b50dd91db`
  )
    .then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then(data => {
      console.log(data);
      console.log('fetchAndShow.ownerrAndBranch = ',ownerAndBranch);
      console.log('fetchAndShow.repo = ',repo);
      updateDT(data, repo, ownerAndBranch);
    })
    .catch(error => {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');
      console.error(error);
    });  
}

function showMsg(msg, type) {
  let alert_type = 'alert-info';

  if (type === 'danger') {
    alert_type = 'alert-danger';
  }

  document.getElementById('footer').innerHTML = '';

  document.getElementById('data-body').innerHTML = `
        <div class="alert ${alert_type} alert-dismissible fade show" role="alert">
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            ${msg}
        </div>
    `;
}

function getRepoFromUrl() {
  const urlRepo = location.hash && location.hash.slice(1);

  return urlRepo && decodeURIComponent(urlRepo);
}

async function fetchRepoInfo(repo) {
  repo = repo.replace('https://github.com/', '');
  repo = repo.replace('http://github.com/', '');
  repo = repo.replace('.git', '');

  // for example, https://api.github.com/repos/techgaun/active-forks
  return await fetch(
    `https://api.github.com/repos/${repo}?client_id=fe51cb18a764a29fc455&client_secret=8f7b630d487247659702cca0ebb7242b50dd91db`
  )
    .then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then(data => {
      console.log(data);
      var str = '';
      var value = str.concat(data.owner.login,':',data.default_branch);
      console.log('fetchRepoInnfo.value = ', value);
      return value;
    })
    .catch(error => {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');
      console.error(error);
    });
}

async function fetchForkInfo(repo, ownerAndBranch, forkOwner, forkBranch) {
  repo = repo.replace('https://github.com/', '');
  repo = repo.replace('http://github.com/', '');
  repo = repo.replace('.git', '');

  // for example, https://api.github.com/repos/techgaun/active-forks/compare/techgaun:master...RedTahr:master
  return await fetch(
    `https://api.github.com/repos/${repo}/compare/${ownerAndBranch}...${forkOwner}:${forkBranch}?client_id=fe51cb18a764a29fc455&client_secret=8f7b630d487247659702cca0ebb7242b50dd91db`
  )
    .then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then(data => {
      console.log(data);
      return data.status + '+' + data.total_commits;   
    })
    .catch(error => {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');
      console.error(error);
      return ''
    });
}
