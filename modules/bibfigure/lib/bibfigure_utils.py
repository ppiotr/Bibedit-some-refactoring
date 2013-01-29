def strip_control_characters(input):
	if input:
		import re
		# unicode invalid characters
		RE_XML_ILLEGAL = u'([\u0000-\u0008\u000b-\u000c\u000e-\u001f\ufffe-\uffff])' + \
							u'|' + u'([%s-%s][^%s-%s])|([^%s-%s][%s-%s])|([%s-%s]$)|(^[%s-%s])' %\
							(unichr(0xd800),unichr(0xdbff),unichr(0xdc00),unichr(0xdfff),  
						   	unichr(0xd800),unichr(0xdbff),unichr(0xdc00),unichr(0xdfff),  
						   	unichr(0xd800),unichr(0xdbff),unichr(0xdc00),unichr(0xdfff),  
						   	)
		input = re.sub(RE_XML_ILLEGAL, "", input)
		# ascii control characters
		input = re.sub(r"[\x01-\x1F\x7F]", "", input)
	return input  

def LCS(X, Y):
	m = len(X)
	n = len(Y)
	# An (m+1) times (n+1) matrix
	C = [[0] * (n + 1) for i in range(m + 1)]
	for i in range(1, m + 1):
		for j in range(1, n + 1):
			if X[i - 1] == Y[j - 1]: 
				C[i][j] = C[i - 1][j - 1] + 1
			else:
		            C[i][j] = max(C[i][j - 1], C[i - 1][j])
	return C

def iterative(C, X, Y, m, n):
	i = m
	j = n
	s = ''
	list_chars = []
	#writeMatrix(C,m,n)
	while(i!=0 and j!=0):
		print i, j
		if X[i - 1] == Y[j - 1]:
			list_chars.insert(0, X[i - 1])
			i = i-1
			j = j-1
		else:
			if C[i][j - 1] > C[i - 1][j]:
				j = j - 1
			else:
				i = i - 1
	for c in list_chars:
		s += c
	return s

def backTrack(C, X, Y, i, j):
	if i == 0 or j == 0:
	      return ""
	elif X[i - 1] == Y[j - 1]:
		return backTrack(C, X, Y, i - 1, j - 1) + X[i - 1]
	else:
		if C[i][j - 1] > C[i - 1][j]:
			return backTrack(C, X, Y, i, j - 1)
		else:
			return backTrack(C, X, Y, i - 1, j)

def levenshtein(a, b):
    "Calculates the Levenshtein distance between a and b."
    n, m = len(a), len(b)
    if n > m:
        # Make sure n <= m, to use O(min(n,m)) space
        a, b = b, a
        n, m = m, n
        
    current = range(n + 1)
    for i in range(1, m + 1):
        previous, current = current, [i] + [0] * n
        for j in range( 1, n + 1 ):
            add, delete = previous[j] + 1, current[j - 1] + 1
            change = previous[j - 1]
            if a[j - 1] != b[i - 1]:
                change = change + 1
            current[j] = min(add, delete, change)
    return current[n]

def write_matrix(A, m, n):
	for i in range(m + 1):
		for j in range(n + 1):
			sys.stdout.write( str(A[i][j]) + '  ')
		print ''